import { usePortrait } from "./usePortrait";
import { parsePortrait } from "./assets";

// personagens cujo portrait deve ser ampliado sem suavizar (pixel art / baixa resolução)
const PIXELATED = new Set(["beat"]);

export default function Portrait({ person, side, expression }) {
  const src = usePortrait(person?.portrait, expression);
  const pixelated = PIXELATED.has(parsePortrait(person?.portrait)?.char);

  return (
    <div
      className="portrait"
      data-side={side}
      aria-hidden="true"
      style={
        src
          ? {
              backgroundImage: `url("${src}")`,
              imageRendering: pixelated ? "pixelated" : undefined,
            }
          : undefined
      }
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="portrait__shield" />
    </div>
  );
}