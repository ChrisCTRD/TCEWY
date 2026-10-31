import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useChatStore } from "./chatStore";
import { useKeys } from "./useKeys";
import { useExit } from "./useExit";

const EMPTY = [];
const keyOf = (m) => m.clientId ?? m.id; // mesma chave do TalkLayer/Balloon
const MIN_THUMB = 0.08;

// Chat Log (design do NEO). A seleção é guardada pela chave da mensagem, não pelo índice:
// o id temporário vira o real no ack e carregar mensagens antigas desloca os índices.
// A entrada selecionada é centralizada na lista (a mais recente também: a lista tem folga embaixo).
export default function ChatLog({ conversationId, onClose }) {
  const me = useChatStore((s) => s.me);
  const contact = useChatStore((s) => s.contacts[conversationId]);
  const messages = useChatStore((s) => s.messages[conversationId]) ?? EMPTY;
  const hasMore = useChatStore((s) => s.cursors[conversationId]?.hasMore);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const { close, closingRef, rootProps } = useExit(onClose);

  const [selKey, setSelKey] = useState(() => (messages.length ? keyOf(messages[messages.length - 1]) : null));
  const found = messages.findIndex((m) => keyOf(m) === selKey);
  const idx = found === -1 ? messages.length - 1 : found;

  const listRef = useRef(null);
  const trackRef = useRef(null);
  const refs = useRef([]);
  const first = useRef(true);
  const [thumb, setThumb] = useState({ top: 0, size: 1, scrollable: false });

  // barra de rolagem própria (a do navegador fica escondida no CSS)
  const syncThumb = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const size = Math.max(MIN_THUMB, el.clientHeight / el.scrollHeight);
    setThumb({ size, top: max > 0 ? (el.scrollTop / max) * (1 - size) : 0, scrollable: max > 1 });
  }, []);

  // centraliza a entrada selecionada (instantâneo na abertura, suave depois)
  useLayoutEffect(() => {
    const list = listRef.current;
    const el = refs.current[idx];
    if (!list || !el) return;
    const top = el.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2;
    list.scrollTo({ top: Math.max(0, top), behavior: first.current ? "auto" : "smooth" });
    first.current = false;
    syncThumb();
  }, [idx, messages.length, syncThumb]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(syncThumb);
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncThumb]);

  const move = (d) => {
    if (closingRef.current) return;
    const next = idx + d;
    if (next < 0) {
      if (hasMore) loadMessages(conversationId, true); // chegou no topo: busca mais antigas
      return;
    }
    if (next >= messages.length) return;
    setSelKey(keyOf(messages[next]));
  };

  // modal: Esc/Espaço/Tab/Ctrl fecham só o Chat Log
  useKeys(
    {
      "KeyW,ArrowUp": () => move(-1),
      "KeyS,ArrowDown": () => move(1),
      "Space,Escape,Tab,ControlLeft": close,
    },
    true,
    { modal: true }
  );

  // arrastar o thumb da barra
  function onThumbDown(e) {
    e.preventDefault();
    const list = listRef.current;
    const track = trackRef.current;
    if (!list || !track) return;
    const startY = e.clientY;
    const startTop = list.scrollTop;
    const max = list.scrollHeight - list.clientHeight;
    const size = Math.max(MIN_THUMB, list.clientHeight / list.scrollHeight);
    const range = track.clientHeight * (1 - size);
    const onMove = (ev) => {
      if (range > 0) list.scrollTop = startTop + ((ev.clientY - startY) / range) * max;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const nameOf = (m) =>
    m.senderPlayerId === me.playerId
      ? me.displayName ?? me.playerId
      : contact?.displayName ?? contact?.playerId;

  return (
    <div className="clog" role="dialog" aria-label="Chat Log" {...rootProps}>
      <div className="clog__panel">
        <h1>CHAT LOG</h1>
        <div className="clog__body">
          <ol className="clog__list" ref={listRef} onScroll={syncThumb}>
            {messages.map((m, i) => (
              <li
                key={keyOf(m)}
                ref={(el) => (refs.current[i] = el)}
                data-sel={i === idx || undefined}
                onClick={() => setSelKey(keyOf(m))}
              >
                {i === idx && (
                  <svg className="clog__arrow" viewBox="0 0 28 28" aria-hidden="true">
                    <path d="M4 4 L22 22 M22 8 V22 H8" />
                  </svg>
                )}
                <span className="clog__name">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 9h4l6-5v16l-6-5H3z M16 8c2 2 2 6 0 8 M19 5c4 4 4 10 0 14" />
                  </svg>
                  {nameOf(m)}
                </span>
                <p>{m.deleted || m.balloon === "scribble" ? "…" : m.text}</p>
              </li>
            ))}
          </ol>

          {thumb.scrollable && (
            <div className="clog__bar" aria-hidden="true">
              <i className="clog__caret">▲</i>
              <div className="clog__track" ref={trackRef}>
                <span
                  className="clog__thumb"
                  style={{ height: `${thumb.size * 100}%`, top: `${thumb.top * 100}%` }}
                  onPointerDown={onThumbDown}
                />
              </div>
              <i className="clog__caret">▼</i>
            </div>
          )}
        </div>
      </div>
      <footer className="chat-footer">
        <button onClick={close}>
          <span className="glyph">␣</span> Back
        </button>
      </footer>
    </div>
  );
}
