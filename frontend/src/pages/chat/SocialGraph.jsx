import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { iconSrc } from "./assets";
import { useSocialUi } from "./socialUiStore";
import { useChatStore } from "./chatStore";

const SELECTED_ZOOM = 1.3;  // zoom ao selecionar alguém; use null para manter o zoom atual
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.2;
const PANEL = 0.32;         // fração da largura que o painel de perfil ocupa
const DRAG_THRESHOLD = 5;   // px de movimento até contar como arrastar
const RAD_STEP = 95;        // distância entre os nós
const GOLDEN = 2.399963;
const REF_H = 1080;         // altura de referência da câmera

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function layout(contacts) {
  return [...contacts]
    .sort((a, b) => a.conversationId.localeCompare(b.conversationId))
    .map((c, i) => {
      const r = RAD_STEP * Math.sqrt(i + 2);
      const a = i * GOLDEN;
      return { c, x: Math.cos(a) * r, y: Math.sin(a) * r };
    });
}

function Arrow() {
  return (
    <svg className="node__arrow" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M4 4 L32 32 M32 32 L32 14 M32 32 L14 32" />
    </svg>
  );
}

function Node({ id, x, y, status, icon, label, selected, onSelect }) {
  return (
    <button
      className="node"
      data-status={status}
      data-selected={selected || undefined}
      style={{ left: x, top: y }}
      aria-label={label}
      onClick={() => onSelect(id)}
    >
      <span className="node__ring-wrap"><span className="node__ring" /></span>
      <img
        className="node__icon"
        src={icon}
        alt=""
        draggable={false}
        onError={(e) => {
          if (!e.currentTarget.src.endsWith("/empty.png")) e.currentTarget.src = "/empty.png";
        }}
      />
      {selected && <Arrow />}
    </button>
  );
}

const ARROWS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
};

// vizinho mais "natural" na direção da seta: dentro de ~60° e perto do eixo
function pickNeighbor(points, from, [ux, uy]) {
  let best = null;
  let bestScore = Infinity;
  for (const p of points) {
    if (p.id === from.id) continue;
    const dx = p.x - from.x;
    const dy = p.y - from.y;
    const fwd = dx * ux + dy * uy;
    if (fwd <= 0) continue;
    const perp = Math.abs(dx * uy - dy * ux);
    const penalty = perp > fwd * 1.7 ? 1000 : 0; // fora do cone: só vale se não houver nada melhor
    const score = fwd + 2 * perp + penalty * 1000;
    if (score < bestScore) { bestScore = score; best = p; }
  }
  return best;
}

export default function SocialGraph({ contacts, me, selectedId, onSelect, panelOpen = true }) {
  const box = useRef(null);
  const drag = useRef(null);
  const [size, setSize] = useState({ w: 1920, h: REF_H });
  const [dragging, setDragging] = useState(false);
  const [animate, setAnimate] = useState(false);
  // câmera em unidades de 1080p: x/y em "px de referência", k = zoom
  const [view, setView] = useState(() => {
    const { x, y, k } = useSocialUi.getState();
    return { x, y, k };
  });

  const nodes = useMemo(() => layout(contacts), [contacts]);
  const base = size.h / REF_H;
  const panelFrac = panelOpen ? PANEL : 0; // sem painel, o nó selecionado fica no centro da tela
  const menuOpen = useChatStore((s) => s.openConversationId === null);

  // câmera que centraliza o nó `id` na área livre
  function cameraFor(id, k) {
    const n = id === "me" ? { x: 0, y: 0 } : nodes.find((n) => n.c.conversationId === id);
    if (!n) return null;
    return {
      x: -((size.w / base) * panelFrac) / 2 - n.x * k,
      y: REF_H * 0.04 - n.y * k,
      k,
    };
  }

  // mede o tamanho ANTES do primeiro desenho, pra câmera restaurada já nascer no lugar certo
  useLayoutEffect(() => {
    const el = box.current;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // liga as animações só depois do primeiro desenho: a câmera aparece "seca"
  useEffect(() => {
    let id2;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setAnimate(true));
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, []);

  // selecionou alguém: centraliza na área livre. Limpar a seleção NÃO mexe na câmera.
  const prevSelected = useRef(selectedId);
  useEffect(() => {
    if (prevSelected.current === selectedId) return; // também ignora a montagem inicial
    prevSelected.current = selectedId;
    if (!selectedId) return;
    setView((v) => cameraFor(selectedId, SELECTED_ZOOM ?? v.k) ?? v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Hide/Show Profile: recentraliza o nó selecionado (mantém o zoom atual)
  const prevPanel = useRef(panelOpen);
  useEffect(() => {
    if (prevPanel.current === panelOpen) return;
    prevPanel.current = panelOpen;
    if (!selectedId) return;
    setView((v) => cameraFor(selectedId, v.k) ?? v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelOpen]);

  // setas do teclado: movem a seleção entre os nós (só com o Menu aberto e fora de campos de texto)
  const nav = useRef(null);
  nav.current = { nodes, selectedId, onSelect };
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => {
      const dir = ARROWS[e.key];
      if (!dir || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      const { nodes, selectedId, onSelect } = nav.current;
      const points = [
        { id: "me", x: 0, y: 0 },
        ...nodes.map(({ c, x, y }) => ({ id: c.conversationId, x, y })),
      ];
      const from = points.find((p) => p.id === selectedId);
      if (!from) return onSelect("me"); // sem seleção: começa por você
      const next = pickNeighbor(points, from, dir);
      if (next) onSelect(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

    const latest = useRef(null);
    latest.current = { ...view, selectedId };
    useEffect(() => () => useSocialUi.getState().save(latest.current), []);

  function onPointerDown(e) {
    if (e.button !== 0) return;
    drag.current = { px: e.clientX, py: e.clientY, vx: view.x, vy: view.y, moved: false };
  }

  function onPointerMove(e) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      d.moved = true;
      setDragging(true);
      box.current.setPointerCapture(e.pointerId);
    }
    setView((v) => ({ ...v, x: d.vx + dx / base, y: d.vy + dy / base }));
  }

  function onPointerUp(e) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      setDragging(false);
      box.current.releasePointerCapture?.(e.pointerId);
    } else if (!e.target.closest(".node")) {
      onSelect(null); // clique no fundo: só limpa a seleção, a câmera fica onde está
    }
  }

  function onWheel(e) {
    setView((v) => ({ ...v, k: clamp(v.k * Math.exp(-e.deltaY * 0.0012), MIN_ZOOM, MAX_ZOOM) }));
  }

  return (
    <div
      ref={box}
      className="graph"
      data-dragging={dragging}
      data-animate={animate}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <div
        className="graph__stage"
        style={{
          transform: `translate(${view.x * base}px, ${view.y * base}px) scale(${base * view.k})`,
        }}
      >
        <svg className="graph__lines" width="1" height="1">
          {nodes
            .filter(({ c }) => c.status === "friend")
            .map(({ c, x, y }) => (
              <line key={c.conversationId} x1="0" y1="0" x2={x} y2={y} />
            ))}
        </svg>

        <Node
          id="me" x={0} y={0} status="me"
          icon={iconSrc(me)} label={me?.displayName ?? "You"}
          selected={selectedId === "me"} onSelect={onSelect}
        />

        {nodes.map(({ c, x, y }) => (
          <Node
            key={c.conversationId}
            id={c.conversationId} x={x} y={y} status={c.status}
            icon={iconSrc(c)} label={c.displayName}
            selected={selectedId === c.conversationId} onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}