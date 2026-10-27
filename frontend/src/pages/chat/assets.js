// ícone do nó: sem ícone configurado, usa o empty.png
export const iconSrc = (p) =>
  !p?.icon || p.icon === "icon_default" ? "/empty.png" : `/icons/${p.icon}.png`;

export const PORTRAIT_STATE = { default: 0, fight: 1, annoyed: 2, redeyes: 3, thoughtful: 4 };

export function parsePortrait(value) {
  if (!value) return null;
  const [char, ...rest] = String(value).replace(/\.(png|webp)$/i, "").split("_");
  return { char, state: PORTRAIT_STATE[rest.join("_")] ?? 0 };
}