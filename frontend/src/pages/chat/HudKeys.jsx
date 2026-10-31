// Ícones de atalho no canto da conversa (estilo NEO): Chat Log (Ctrl) e Main Menu (Tab/Esc)
export default function HudKeys({ onLog, onMenu }) {
  return (
    <nav className="hud" aria-label="Shortcuts">
      <button onClick={onLog}>
        <span>Chat Log</span>
        <kbd>Ctrl</kbd>
      </button>
      <button onClick={onMenu}>
        <span>Main Menu</span>
        <kbd>Tab</kbd>
      </button>
    </nav>
  );
}
