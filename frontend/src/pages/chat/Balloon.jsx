import { useLayoutEffect, useRef, useState } from "react";

const CELLS = ["tl", "tm", "tr", "ml", "mm", "mr", "bl", "bm", "br"]; // top/middle/bottom + left/middle/right

// Mesmo componente para a DM e, depois, para o Chat Log.
// Normal: 9-slice (nballoonXY.webp) + tail separado. Scribble: imagem única com tail embutido.
export default function Balloon({ message, side, slot = 0, onEdit }) {
  const scribble = message.balloon === "scribble";
  const canEdit = side === "me" && !message.deleted && !message.sending && !!onEdit;

  // conta quantas linhas o texto quebrou -> o CSS usa data-lines para dar mais folga
  const lineRef = useRef(null);
  const [lines, setLines] = useState(1);
  useLayoutEffect(() => {
    const el = lineRef.current;
    if (!el) return;
    const measure = () => {
      const lh = parseFloat(getComputedStyle(el).lineHeight);
      if (lh) setLines(Math.max(1, Math.round(el.offsetHeight / lh)));
    };
    measure();
    const ro = new ResizeObserver(measure); // --u muda com o tamanho da janela
    ro.observe(el);
    return () => ro.disconnect();
  }, [message.text, message.deleted]);

  return (
    <div
      className="balloon"
      data-side={side}
      data-slot={slot}
      data-lines={Math.min(lines, 5)}
      data-balloon={message.balloon}
      data-deleted={message.deleted || undefined}
      data-failed={message.failed || undefined}
      data-sending={message.sending || undefined}
      data-editable={canEdit || undefined}
      onClick={canEdit ? () => onEdit(message) : undefined}
    >
      {scribble ? (
        <span className="balloon__scribble" aria-hidden="true" />
      ) : (
        <>
          {CELLS.map((c) => (
            <span key={c} className={`balloon__cell balloon__cell--${c}`} aria-hidden="true" />
          ))}
          <img className="balloon__tail" src="/balloons/nballoontail.webp" alt="" draggable={false} />
        </>
      )}
      <p className="balloon__text">
        <span ref={lineRef} className="balloon__line">
          {message.deleted ? "" : message.text}
        </span>
      </p>
    </div>
  );
}
