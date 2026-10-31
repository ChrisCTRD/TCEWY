import { useEffect, useMemo, useRef, useState } from "react";
import { matchPath, useNavigate } from "react-router-dom";
import { useChatStore } from "./chatStore";
import { canSend } from "./chatRules";
import { lastBy, withPose } from "./balloonPresets";
import Portrait from "./Portrait";
import Balloon from "./Balloon";
import "./talk.css";
import { fxUrl } from "./assets";
import { useKeys } from "./useKeys";
import TalkMenu from "./TalkMenu";
import ChatLog from "./ChatLog";
import HudKeys from "./HudKeys";
import "./talkmenu.css";

const EMPTY = [];
const NO_KEYS = new Set();
const keyOf = (m) => m.clientId ?? m.id; // mesma chave usada no <Balloon key>

// Entrada completa (THEM + balões esperando os portraits): one-time, só no refresh direto em /chat/:id.
// Vindo do /chat ou de outra conversa, só o ME anima e os balões que já existiam aparecem parados.
// Refresh em /chat (Menu) não conta: BOOT_ID fica null.
const BOOT_ID = matchPath("/chat/:id", window.location.pathname)?.params.id ?? null;
let bootIntroPending = BOOT_ID !== null; // vira false assim que a entrada roda

export default function TalkLayer({ conversationId, blurred }) {
  const navigate = useNavigate();
  const me = useChatStore((s) => s.me);
  const contact = useChatStore((s) => s.contacts[conversationId]);
  const messages = useChatStore((s) => s.messages[conversationId] ?? EMPTY);
  const loaded = useChatStore((s) => s.messages[conversationId] !== undefined);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const [draft, setDraft] = useState("");
  const [panel, setPanel] = useState(null); // null | "talk" | "log"
  const sectionRef = useRef(null);
  const fxSrc = useMemo(() => fxUrl(conversationId), [conversationId]);

  const hasContact = !!contact;
  const writable = hasContact && canSend(contact);

  // E = menu de balão/portrait · Ctrl esq. = Chat Log · Tab/Esc = Menu principal
  // (só com a conversa em foco: o Menu aberto desfoca esta camada; os painéis têm os próprios atalhos)
  useKeys(
    {
      KeyE: () => writable && setPanel("talk"),
      ControlLeft: () => setPanel("log"),
      "Tab,Escape": () => navigate("/chat"),
    },
    hasContact && !blurred && panel === null
  );
  useEffect(() => {
    if (conversationId && hasContact && !loaded) loadMessages(conversationId, false, 2);
  }, [conversationId, hasContact, loaded, loadMessages]);

  // Decidido uma vez por conversa, no momento em que ela vira a ativa (fica fixo enquanto a tela está montada):
  // - intro: THEM anima e os balões esperam os portraits. Só no refresh em /chat/:id. O ME anima a cada troca de conversa.
  // - still: balões que já estavam carregados ao abrir a conversa; entram parados (sem balloon-in).
  //   Mensagens que chegam depois (enviadas/recebidas) e conversas ainda não carregadas animam normalmente.
  const anim = useRef({ id: null, intro: false, still: NO_KEYS });
  if (anim.current.id !== conversationId) {
    const intro = bootIntroPending && conversationId === BOOT_ID;
    anim.current = {
      id: conversationId,
      intro,
      still: loaded && !intro ? new Set(messages.slice(-3).map(keyOf)) : NO_KEYS,
    };
  }
  const { intro, still } = anim.current;

  // no refresh, os balões esperam o slide dos portraits + um respiro (tempos lidos do CSS: --enter e --balloon-gap)
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!intro || !hasContact || !el) return;
    bootIntroPending = false; // gasta o one-time: voltar a esta conversa depois não repete
    const cs = getComputedStyle(el);
    const secs = (name, fallback) => parseFloat(cs.getPropertyValue(name)) || fallback;
    const t = setTimeout(() => setIntroDone(true), (secs("--enter", 1.4) + secs("--balloon-gap", 0.4)) * 1000);
    return () => clearTimeout(t);
  }, [intro, hasContact]);
  const showBalloons = !intro || introDone;

  if (!contact) return <section className="talk" data-blurred={blurred} />;

  // durante a intro não há balão (nem a pose que ele forçaria, ex.: scribble -> annoyed).
  // Se as mensagens ainda estiverem carregando quando a intro acabar, o balão entra assim que chegarem.
  const visible = showBalloons ? messages : EMPTY;

  // última mensagem de cada lado: é o que aparece na tela (a DM é "em tempo real")
  const lastThem = lastBy(visible, contact.playerId);
  const lastMe = lastBy(visible, me.playerId);

  // pose efetiva: o balão (ex.: scribble) pode forçar; senão vale a selecionada
  const themPose = withPose(contact, lastThem);
  const mePose = withPose(me, lastMe);
  const recent = visible.slice(-3);

  return (
    <section
      ref={sectionRef}
      className="talk dm"
      data-blurred={blurred}
      data-intro={intro || undefined}
      data-menu={panel || undefined}
      aria-hidden={blurred}
    >
      <div className="dm__bg" aria-hidden="true" />
      <div className="dm__fx" aria-hidden="true" style={{ backgroundImage: `url("${fxSrc}")` }} />

      {/* key = id da conversa: cada troca de conversa recria estes elementos e a animação de entrada roda de novo.
          Abrir/fechar o Menu não muda o id, então não reanima. */}
      <h2 key={`them-name-${conversationId}`} className="dm__name" data-side="them">{contact.displayName ?? contact.playerId}</h2>
      <h2 key={`me-name-${conversationId}`} className="dm__name" data-side="me">{me.displayName ?? me.playerId}</h2>

      <Portrait key={`them-${conversationId}`} person={themPose} side="them" />
      <Portrait key={`me-${conversationId}`} person={mePose} side="me" />

      {/* fila: novo = slot 0 (embaixo), anterior = 1 (sobe), mais antigo = 2 (sai offscreen) */}
      <div className="dm__balloons">
        {recent.map((m, i) => {
          const slot = recent.length - 1 - i;
          const side = m.senderPlayerId === me.playerId ? "me" : "them";
          return (
            <Balloon
              key={keyOf(m)}
              message={m}
              side={side}
              slot={slot}
              still={still.has(keyOf(m))}
              onEdit={undefined /* TODO: edição por clique (precisa de message:edit no backend) */}
            />
          );
        })}
      </div>

      {/* pins: esquerdo = contato (decorativo), direito = abre o menu de balão/portrait (E) */}
      <span className="dm__pin" data-side="them" aria-hidden="true" />
      <button
        className="dm__pin"
        data-side="me"
        aria-label="Balloons and portraits (E)"
        disabled={!writable}
        onClick={() => setPanel("talk")}
      />

      <HudKeys onLog={() => setPanel("log")} onMenu={() => navigate("/chat")} />

      <input
        className="dm__input"
        disabled={!writable}
        value={draft}
        placeholder={writable ? `Message @${contact.playerId}` : "Connection lost."}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            sendMessage(conversationId, draft.trim());
            setDraft("");
          }
        }}
      />
      {panel === "talk" && <TalkMenu conversationId={conversationId} onClose={() => setPanel(null)} />}
      {panel === "log" && <ChatLog conversationId={conversationId} onClose={() => setPanel(null)} />}
    </section>
  );
}
