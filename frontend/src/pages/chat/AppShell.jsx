import { useEffect, useState } from "react";
import { Navigate, useMatch, useNavigate } from "react-router-dom";
import { useChatStore } from "./chatStore";
import { canOpenDM } from "./chatRules";
import { startStaticPreload, preloadGate, preloadExtras, watchNewContacts } from "./preload";
import TalkLayer from "./TalkLayer";
import MenuOverlay from "./MenuOverlay";
import Loader from "../Loader";
import "./chat.css";

export default function AppShell() {
  const navigate = useNavigate();
  const id = useMatch("/chat/:id")?.params.id ?? null;

  const ready = useChatStore((s) => s.ready);
  const authFailed = useChatStore((s) => s.authFailed);
  const contact = useChatStore((s) => (id ? s.contacts[id] : undefined));
  const last = useChatStore((s) => s.lastConversationId);
  const init = useChatStore((s) => s.init);
  const setOpen = useChatStore((s) => s.setOpenConversation);

  const [loaded, setLoaded] = useState(false); // assets pré-carregados (ou tempo esgotado)
  const [armed, setArmed] = useState(false);   // dispara a animação de abrir o Menu

  const accessible = !!contact && canOpenDM(contact);
  const openId = id && accessible ? id : null;

  useEffect(() => { init(); }, [init]);
  useEffect(() => { setOpen(openId); }, [openId, setOpen]);

  // estáticas (imagens do CSS, fontes) começam a baixar já na montagem, em paralelo com os dados
  useEffect(() => { startStaticPreload(); }, []);

  // com os dados prontos, carrega portraits/ícones/overlay; o Loader fica até terminar
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const { me, contacts } = useChatStore.getState();
    preloadGate({ me, contacts, focusId: id }).finally(() => {
      if (alive) setLoaded(true);
    });
    return () => { alive = false; };
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // depois de aberto: contatos novos carregam na hora; o resto (outras poses/overlays) em segundo plano
  useEffect(() => {
    if (!loaded) return;
    const stop = watchNewContacts();
    const t = setTimeout(() => preloadExtras(useChatStore.getState()), 2000);
    return () => { stop(); clearTimeout(t); };
  }, [loaded]);

  // o Menu monta "fechado" e abre 2 frames depois do Loader sair, para rodar a animação de abertura
  useEffect(() => {
    if (!loaded) return;
    let b;
    const a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setArmed(true)); });
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
  }, [loaded]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (id) navigate("/chat");
      else if (last) navigate(`/chat/${last}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, last, navigate]);

  if (authFailed) return <Navigate to="/login" replace />;
  if (!ready || !loaded) return <div className="shell"><Loader /></div>;
  if (id && !accessible) return <Navigate to="/chat" replace />;

  return (
    <div className="shell">
      <TalkLayer conversationId={openId ?? last} blurred={!openId && armed} />
      <MenuOverlay open={!openId && armed} />
    </div>
  );
}
