import { usePortrait } from "./usePortrait";

export default function Portrait({ person, side, state }) {
  const src = usePortrait(person?.portrait, state);
  return (
    <div
      className="portrait"
      data-side={side}
      aria-hidden="true"
      style={src ? { backgroundImage: `url("${src}")` } : undefined}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="portrait__shield" />
    </div>
  );
}