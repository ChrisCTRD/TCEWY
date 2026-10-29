import { useEffect, useRef, useState } from "react";

// textos editáveis
const TEXT = {
  titleRed: "Log out",
  titleRest: " of your account?",
  sub: "You'll need to log in again to keep chatting.",
  confirm: "Log out",
  cancel: "Not now…",
};

// Confirmação no estilo "Evolve this pin?" do NEO.
// phase: "in" (aberta) | "cancel" (fade só da confirmação) | "confirm" (fade preto em tudo)
export default function LogoutConfirm({ onConfirm, onCancel }) {
  const [phase, setPhase] = useState("in");
  const [focus, setFocus] = useState(1); // 0 = confirmar, 1 = cancelar (começa no lado seguro)
  const done = useRef(false);

  const finish = (kind) => {
    if (done.current) return;
    done.current = true;
    (kind === "confirm" ? onConfirm : onCancel)();
  };
  const choose = (i) => {
    if (phase === "in") setPhase(i === 0 ? "confirm" : "cancel");
  };

  // rede de segurança: se o animationend não disparar, termina mesmo assim
  useEffect(() => {
    if (phase === "in") return;
    const t = setTimeout(() => finish(phase), phase === "confirm" ? 1000 : 450);
    return () => clearTimeout(t);
  }, [phase]);

  // teclado: captura em fase de captura para engolir Q/W, Espaço=Back, Esc e afins enquanto aberta
  const live = useRef();
  live.current = { phase, focus, choose };
  useEffect(() => {
    document.activeElement?.blur?.();
    const onKey = (e) => {
      e.stopImmediatePropagation();
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", "Escape"].includes(e.key) || e.code === "Space") {
        e.preventDefault();
      }
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const s = live.current;
      if (s.phase !== "in") return;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") setFocus(0);
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") setFocus(1);
      else if (e.key === "Enter") s.choose(s.focus);
      else if (e.key === "Escape" || e.code === "Space") s.choose(1);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <div className="lc" data-phase={phase} role="alertdialog" aria-modal="true" aria-labelledby="lc-title">
      {/* filtros do efeito de pincel (bordas "rasgadas" na horizontal) */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <filter id="lc-brush-black" x="-6%" y="-25%" width="112%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.007 0.08" numOctaves="3" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="32" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* branco: mesma borda deslocada, mas só sobra onde o ruído de riscos passa do limiar (-5.5: maior = menos branco) */}
        <filter id="lc-brush-white" x="-8%" y="-30%" width="116%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.15" numOctaves="3" seed="11" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="52" xChannelSelector="R" yChannelSelector="G" result="shape" />
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.35" numOctaves="2" seed="3" result="streak" />
          <feColorMatrix in="streak" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  10 0 0 0 -5.5" result="cut" />
          <feComposite in="shape" in2="cut" operator="in" />
        </filter>
      </svg>

      <div
        className="lc__dim"
        onAnimationEnd={(e) => {
          if (phase === "cancel" && e.animationName === "lc-out") finish("cancel");
        }}
      />

      <div className="lc__panel">
        <div className="lc__brush" />
        <div className="lc__body">
          <h2 id="lc-title" className="lc__title">
            <span className="lc__red">{TEXT.titleRed}</span>
            {TEXT.titleRest}
          </h2>
          <p className="lc__sub">{TEXT.sub}</p>

          <div className="lc__opts">
            {[TEXT.confirm, TEXT.cancel].map((label, i) => (
              <button
                key={i}
                type="button"
                className="lc__opt"
                data-focus={focus === i}
                onMouseEnter={() => setFocus(i)}
                onClick={() => choose(i)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {phase === "confirm" && (
        <div
          className="lc__black"
          onAnimationEnd={(e) => {
            if (e.animationName === "lc-black-in") finish("confirm");
          }}
        />
      )}
    </div>
  );
}
