import { useEffect } from "react";
import { Navigate, useMatch, useNavigate } from "react-router-dom";
import { useChatStore } from "./chatStore";
import { canOpenDM } from "./chatRules";
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

  const accessible = !!contact && canOpenDM(contact);
  const openId = id && accessible ? id : null;

  useEffect(() => { init(); }, [init]);
  useEffect(() => { setOpen(openId); }, [openId, setOpen]);

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
  if (!ready) return <div className="shell"><Loader /></div>;
  if (id && !accessible) return <Navigate to="/chat" replace />;

  return (
    <div className="shell">
      <TalkLayer conversationId={openId ?? last} blurred={!openId} />
      <MenuOverlay open={!openId} />
    </div>
  );
}