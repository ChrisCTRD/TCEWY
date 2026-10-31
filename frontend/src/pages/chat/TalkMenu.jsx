import { useEffect, useState } from "react";
import { useChatStore } from "./chatStore";
import { useKeys } from "./useKeys";
import { useExit } from "./useExit";
import { usePortrait } from "./usePortrait";
import { characterOf } from "./characters";
import { SELECTABLE_BALLOONS } from "./balloonPresets";
import { parsePortrait } from "./assets";

// Menu de balão/portrait da conversa (adaptado do menu de dificuldade do NEO).
// Escolher só mexe no `compose` do store: vale a partir da PRÓXIMA mensagem enviada.
// Scribble é uma ação: envia na hora uma mensagem scribble (pose annoyed) e fecha, sem mexer no compose.
// Fechar toca a animação de saída (fade rápido + colunas em slide out) e só então chama onClose.
const FALLBACK_EXPRESSIONS = ["default", "happy", "annoyed"]; // se o personagem não tiver `expressions`
const COLS = { balloons: 2, portraits: 4 };

function step(i, dx, dy, cols, count) {
  const col = i % cols;
  if (col + dx < 0 || col + dx >= cols) return i;
  const next = i + dx + dy * cols;
  return next < 0 || next >= count ? i : next;
}

// célula de portrait: o próprio portrait da pose (hook, por isso é um componente)
function PortraitCell({ charId, expression }) {
  const src = usePortrait(charId ? `${charId}_default` : null, expression);
  return src ? (
    <img src={src} alt={expression} draggable={false} onContextMenu={(e) => e.preventDefault()} />
  ) : (
    <span className="tm__label">{expression}</span>
  );
}

export default function TalkMenu({ conversationId, onClose }) {
  const me = useChatStore((s) => s.me);
  const compose = useChatStore((s) => s.compose);
  const setCompose = useChatStore((s) => s.setCompose);
  const sendMessage = useChatStore((s) => s.sendMessage);

  const charId = parsePortrait(me.portrait)?.char;
  const char = characterOf(charId);
  const lists = {
    balloons: SELECTABLE_BALLOONS,
    portraits: char?.expressions ?? FALLBACK_EXPRESSIONS,
  };

  const [panel, setPanel] = useState("balloons");
  const [cur, setCur] = useState(() => ({
    balloons: Math.max(0, lists.balloons.indexOf(compose.balloon)),
    portraits: Math.max(0, lists.portraits.indexOf(compose.expression)),
  }));

  // fechar com animação de saída
  const { closing, close, closingRef, rootProps } = useExit(onClose);

  // tira o foco do input/pin para o Enter não ser "consumido" por eles
  useEffect(() => {
    document.activeElement?.blur?.();
  }, []);

  const pick = (p, i) => {
    if (closingRef.current) return;
    if (p === "balloons") {
      const id = lists.balloons[i];
      if (id === "scribble") {
        sendMessage(conversationId, "", { balloon: "scribble", expression: "annoyed" });
        close();
        return;
      }
      setCompose({ balloon: id });
    } else {
      setCompose({ expression: lists.portraits[i] });
    }
  };
  const move = (dx, dy) =>
    !closingRef.current &&
    setCur((c) => ({ ...c, [panel]: step(c[panel], dx, dy, COLS[panel], lists[panel].length) }));

  // modal: Esc/E/Espaço/Tab fecham só este menu, nada embaixo (nem listener antigo) reage
  useKeys(
    {
      "KeyW,ArrowUp": () => move(0, -1),
      "KeyS,ArrowDown": () => move(0, 1),
      "KeyA,ArrowLeft": () => move(-1, 0),
      "KeyD,ArrowRight": () => move(1, 0),
      KeyJ: () => setPanel("balloons"),
      KeyL: () => setPanel("portraits"),
      Enter: () => pick(panel, cur[panel]),
      "KeyE,Escape,Space,Tab": close,
    },
    true,
    { modal: true }
  );

  return (
    <div className="tm" role="dialog" aria-label="Balloons and portraits" {...rootProps}>
      <div className="tm__scrim" onClick={close} />
      <div className="tm__panels">
        {["balloons", "portraits"].map((p) => (
          <section
            key={p}
            className="tm__panel"
            data-side={p === "balloons" ? "left" : "right"}
            data-active={panel === p || undefined}
            onMouseEnter={() => setPanel(p)}
          >
            <h2>{p.toUpperCase()}</h2>
            <div className="tm__grid" data-kind={p}>
              {lists[p].map((id, i) => {
                const chosen = p === "balloons" ? compose.balloon === id : compose.expression === id;
                return (
                  <button
                    key={id}
                    className="tm__cell"
                    data-chosen={chosen || undefined}
                    data-focus={(panel === p && cur[p] === i) || undefined}
                    onClick={() => {
                      setPanel(p);
                      setCur((c) => ({ ...c, [p]: i }));
                      pick(p, i);
                    }}
                  >
                    {p === "balloons" ? (
                      <span className={`tm__balloon tm__balloon--${id}`} />
                    ) : (
                      <PortraitCell charId={charId} expression={id} />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {/* troca de lado (J / L), como o ícone do stick L entre os painéis no NEO */}
        <div className="tm__switch" aria-hidden="true">
          <i>‹</i>
          <kbd>J</kbd>
          <kbd>L</kbd>
          <i>›</i>
        </div>
      </div>

      <footer className="chat-footer">
        <button onClick={close}>
          <span className="glyph">E</span> Close
        </button>
        <button onClick={() => pick(panel, cur[panel])}>
          <span className="glyph glyph--filled">↵</span> Select
        </button>
      </footer>
    </div>
  );
}
