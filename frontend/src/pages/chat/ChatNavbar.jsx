const TABS = ["threads", "thoughts", "archive"];
// sub-abas de cada aba principal (threads não tem)
const SUBS = {
  thoughts: [
    ["social", "SOCIAL NETWORK"],
    ["mental", "MENTAL NOTES"],
  ],
  archive: [
    ["settings", "SETTINGS"],
    ["guide", "GUIDE"],
  ],
};

// seta dupla « (aponta para a esquerda; a da direita é a mesma girada em CSS)
function DoubleChevron() {
  const d = "M27 7 L10 24 L27 41 M43 7 L26 24 L43 41";
  return (
    <svg viewBox="0 0 52 48" aria-hidden="true">
      <path d={d} className="chat-arrow__outline" />
      <path d={d} className="chat-arrow__fill" />
    </svg>
  );
}

// bounce = { dir: "left" | "right", n } — n muda a cada troca, para reiniciar a animação
export default function ChatNavbar({ tab, onTab, sub, onSub, onCycle, bounce }) {
  const arrow = (side) => (
    <button
      key={`${side}-${bounce?.dir === side ? bounce.n : 0}`}
      className="chat-arrow"
      data-side={side}
      data-bounce={bounce?.dir === side || undefined}
      aria-label={side === "left" ? "Previous tab" : "Next tab"}
      onClick={() => onCycle(side === "left" ? -1 : 1)}
    >
      <DoubleChevron />
    </button>
  );

  return (
    <header className="chat-nav">
      <div className="chat-nav__tabs">
        {arrow("left")}
        {TABS.map((t) => (
          <button key={t} className="chat-tab" data-active={tab === t} onClick={() => onTab(t)}>
            {t.toUpperCase()}
          </button>
        ))}
        {arrow("right")}
      </div>

      {SUBS[tab] && (
        <div className="chat-nav__subtabs">
          {SUBS[tab].map(([key, label]) => (
            <button key={key} className="chat-subtab" data-active={sub === key} onClick={() => onSub(key)}>
              {label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
