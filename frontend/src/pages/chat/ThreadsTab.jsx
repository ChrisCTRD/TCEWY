import { useCallback, useEffect, useRef, useState } from "react";
import ActionBar from "./ActionBar";
import { useChatStore } from "./chatStore";
import { errorText } from "./errors";
import { usePortrait } from "./usePortrait";
import { iconLg, iconSm, parsePortrait } from "./assets";
import { CHARACTERS, characterOf, portraitValue } from "./characters";
import { preloadCharacter } from "./preload";
import { useKeys } from "./useKeys";
import "./threads.css";

const COLS = 5; // colunas da grade (bate com o CSS); ↑/↓ andam uma linha
const EQUIP = ["equip"];
const NO_KEYS = [];

const toEmpty = (e) => {
  if (!e.currentTarget.src.endsWith("/empty.png")) e.currentTarget.src = "/empty.png";
};

// mesma seta laranja do grafo do Social Network
function Arrow() {
  return (
    <svg className="thr-arrow" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M4 4 L32 32 M32 32 L32 14 M32 32 L14 32" />
    </svg>
  );
}

// Portrait equipado (esquerda). Espelho do ProfilePanel: só anima quando o personagem MUDA,
// abrir a aba não anima. Se a pose de prévia não existir, cai na default.
function EquippedPortrait({ charId, expression }) {
  const value = charId ? `${charId}_default` : null;
  const preview = usePortrait(value, expression);
  const base = usePortrait(value, "default");
  // não mostra o default enquanto a pose escolhida ainda carrega (evita o "default antes do happy");
  // só cai no default se a pose não chegar (pose inexistente) depois de um respiro
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    setFallback(false);
    if (preview) return;
    const t = setTimeout(() => setFallback(true), 700);
    return () => clearTimeout(t);
  }, [preview, value, expression]);
  const art = preview ?? (fallback ? base : null);

  const prev = useRef(charId);
  const [enter, setEnter] = useState(0);
  useEffect(() => {
    if (prev.current === charId) return;
    prev.current = charId;
    if (charId) setEnter((n) => n + 1);
  }, [charId]);

  if (!art) return null;
  const common = {
    src: art,
    alt: "",
    draggable: false,
    "data-enter": enter > 0 || undefined,
    onContextMenu: (e) => e.preventDefault(),
    onError: (e) => (e.currentTarget.style.display = "none"),
  };
  return (
    <>
      <img key={`art-${enter}`} className="thr__art" {...common} />
      {/* silhueta preta só embaixo: o portrait "afunda" no preto, como no Social Network */}
      <img key={`shade-${enter}`} className="thr__art thr__art--shade" aria-hidden="true" {...common} />
    </>
  );
}

export default function ThreadsTab() {
  const me = useChatStore((s) => s.me);
  const menuOpen = useChatStore((s) => s.openConversationId === null);

  const equippedId = parsePortrait(me?.portrait)?.char ?? null;
  const equipped = characterOf(equippedId);

  // o cursor começa no personagem equipado
  const [index, setIndex] = useState(() => Math.max(0, CHARACTERS.findIndex((c) => c.id === equippedId)));
  const [error, setError] = useState("");
  const sel = CHARACTERS[index];
  useEffect(() => { preloadCharacter(sel); }, [sel]);
  const selIsEquipped = sel.id === equippedId;

  const equip = useCallback(async (c) => {
    const st = useChatStore.getState();
    if (parsePortrait(st.me?.portrait)?.char === c.id) return; // já está equipado
    setError("");
    try {
      await st.setCharacter({ portrait: portraitValue(c), icon: c.icon });
    } catch (e) {
      setError(errorText(e.code));
    }
  }, []);

  // ActionBar: "Change Character" (Enter) só existe quando o cursor está em outro personagem
  const run = useCallback((key) => { if (key === "equip") equip(sel); }, [equip, sel]);

  // WASD/setas movem o cursor (só com o Menu aberto)
  const move = (d) =>
    setIndex((i) => {
      const n = i + d;
      return n >= 0 && n < CHARACTERS.length ? n : i;
    });
  useKeys(
    {
      "KeyA,ArrowLeft": () => move(-1),
      "KeyD,ArrowRight": () => move(1),
      "KeyW,ArrowUp": () => move(-COLS),
      "KeyS,ArrowDown": () => move(COLS),
    },
    menuOpen
  );

  return (
    <div className="threads">
      <EquippedPortrait charId={equippedId} expression={equipped?.previewExpression ?? "happy"} />

      <div className="thr-main">
        <h2 className="thr__name">{equipped?.short ?? equippedId?.toUpperCase() ?? ""}</h2>

        <div className="thr-list">
          {CHARACTERS.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className="thr-slot"
              data-active={i === index || undefined}
              aria-label={c.name}
              aria-current={c.id === equippedId || undefined}
              onPointerEnter={(e) => e.pointerType === "mouse" && setIndex(i)}
              onFocus={() => setIndex(i)}
              // 1º toque/clique move o cursor; no personagem já destacado, equipa
              onClick={() => (i === index ? equip(c) : setIndex(i))}
            >
              <img className="thr-slot__icon" src={iconSm(c.icon)} alt="" draggable={false} onError={toEmpty} />
              {c.id === equippedId && <span className="thr-slot__eq" aria-hidden="true">✓</span>}
              {i === index && <Arrow />}
            </button>
          ))}
        </div>

        {error && <p className="thr__error">{error}</p>}
      </div>

      <section className="thr-detail" aria-live="polite">
        <header className="thr-detail__head">
          <span className="thr-detail__no">No. {String(sel.number).padStart(3, "0")}</span>
          <h3 className="thr-detail__name">{sel.name}</h3>
        </header>
        {/* key: troca de personagem refaz o fade curto do conteúdo */}
        <div className="thr-detail__body" key={sel.id}>
          <img className="thr-detail__art" src={iconLg(sel.icon)} alt="" draggable={false} onError={toEmpty} />
          <p className="thr-detail__desc">{sel.description}</p>
        </div>
        <footer className="thr-detail__foot">
          <h4 className="thr-detail__label">STATUS</h4>
          <p className="thr-detail__value">{selIsEquipped ? "Equipped" : "Not equipped"}</p>
        </footer>
      </section>

      <ActionBar keys={selIsEquipped ? NO_KEYS : EQUIP} onAction={run} />
    </div>
  );
}
