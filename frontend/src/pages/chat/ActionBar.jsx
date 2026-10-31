import { useNavigate } from "react-router-dom";
import { useChatStore } from "./chatStore";
import { useKeys } from "./useKeys";

const META = {
  open:    { label: "Open DM" },
  accept:  { label: "Accept" },
  decline: { label: "Decline", danger: true },
  remove:  { label: "Remove", danger: true },
  cancel:  { label: "Cancel Request", danger: true },
  close:   { label: "Close DM", danger: true },
  equip:   { label: "Change Character" },
};

// Teclas das ações do Menu (mesmo papel = mesma tecla em qualquer aba):
//   J (ou Enter) = ação principal · K = ação negativa · L = ação extra · M = Hide/Display · Espaço = Back
// slots = { J: "accept", K: "decline", L: "open" } (slot sem ação = ausente/null)
// Mapa por aba (mesmo papel = mesma tecla; "open" = "Open DM"):
//   Friends:            J open    · K remove
//   Conversations:      J open    · K close
//   Requests recebidos: J accept  · K decline · L open (se já houver DM)
//   Requests enviados:             K cancel  (cancelar o pedido que VOCÊ enviou)
//   Profile:            J equip
// profile = { available, hidden, onToggle } — botão HIDE/DISPLAY PROFILE (tecla M)
export default function ActionBar({ slots = {}, onAction, profile }) {
  const navigate = useNavigate();
  const last = useChatStore((s) => s.lastConversationId);
  const menuOpen = useChatStore((s) => s.openConversationId === null);

  const goBack = () => last && navigate(`/chat/${last}`);

  const fire = (slot) => {
    const action = slots[slot];
    if (action && META[action]) onAction(action);
  };

  // Com um botão focado, Enter/Espaço já disparam o click dele; sem este guard a ação rodaria duas vezes
  const onButton = () => document.activeElement?.tagName === "BUTTON";

  // só valem com o Menu aberto; useKeys já ignora digitação em campos de texto
  useKeys(
    {
      KeyJ: () => fire("J"),
      Enter: () => !onButton() && fire("J"),
      KeyK: () => fire("K"),
      KeyL: () => fire("L"),
      KeyM: () => profile?.available && profile.onToggle(),
      Space: () => !onButton() && goBack(),
    },
    menuOpen
  );
  
  return (
    <footer className="chat-footer">
      {["J", "K", "L"].map((slot) => {
        const k = slots[slot];
        const meta = k && META[k];
        return (
          meta && (
            <button key={slot} data-danger={meta.danger || undefined} onClick={() => onAction(k)}>
              <span className="glyph">{slot}</span>
              {meta.label}
            </button>
          )
        );
      })}
      {profile?.available && (
        <button onClick={profile.onToggle}>
          <span className="glyph">M</span>
          {profile.hidden ? "Display Profile" : "Hide Profile"}
        </button>
      )}
      {last && (
        <button onClick={goBack}>
          <span className="glyph glyph--filled">✕</span>
          Back
        </button>
      )}
    </footer>
  );
}
