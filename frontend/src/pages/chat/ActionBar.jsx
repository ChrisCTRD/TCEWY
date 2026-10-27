import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "./chatStore";

const META = {
  open:    { label: "Open DM",  hotkey: "e", glyph: "E" },
  accept:  { label: "Accept",   hotkey: "a", glyph: "A" },
  decline: { label: "Decline",  hotkey: "d", glyph: "D", danger: true },
  remove:  { label: "Remove",   hotkey: "r", glyph: "R", danger: true },
  close:   { label: "Close DM", hotkey: "c", glyph: "C", danger: true },
};

// profile = { available, hidden, onToggle } — botão HIDE/SHOW PROFILE (tecla H)
export default function ActionBar({ keys, onAction, profile }) {
  const navigate = useNavigate();
  const last = useChatStore((s) => s.lastConversationId);
  const menuOpen = useChatStore((s) => s.openConversationId === null);

  // atalhos só valem com o Menu aberto e fora de campos de texto
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (e.code === "Space" && last) {
        e.preventDefault(); // não "clica" no botão que estiver focado
        document.activeElement?.blur?.();
        navigate(`/chat/${last}`);
        return;
      }
      if (e.key.toLowerCase() === "h" && profile?.available) {
        profile.onToggle();
        return;
      }
      const k = keys.find((key) => META[key].hotkey === e.key.toLowerCase());
      if (k) onAction(k);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, keys, onAction, last, navigate, profile]);

  return (
    <footer className="chat-footer">
      {keys.map((k) => (
        <button key={k} data-danger={META[k].danger || undefined} onClick={() => onAction(k)}>
          <span className="glyph">{META[k].glyph}</span>
          {META[k].label}
        </button>
      ))}
      {profile?.available && (
        <button onClick={profile.onToggle}>
          <span className="glyph">H</span>
          {profile.hidden ? "Show Profile" : "Hide Profile"}
        </button>
      )}
      {last && (
        <button onClick={() => navigate(`/chat/${last}`)}>
          <span className="glyph glyph--filled">✕</span>
          Back
        </button>
      )}
    </footer>
  );
}