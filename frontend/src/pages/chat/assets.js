// ícone do nó: sem ícone configurado, usa o empty.png
export const iconSrc = (p) =>
  !p?.icon || p.icon === "icon_default" ? "/empty.png" : `/icons/${p.icon}.png`;

// Expressões do sistema (as demais, extras, são pedidas pelo nome direto)
export const PORTRAIT_EXPRESSION = {
  DEFAULT: "default",
  FIGHT: "fight",
  ANNOYED: "annoyed",
  REDEYES: "redeyes",
  THOUGHTFUL: "thoughtful",
};

// "neku_default" -> { char: "neku", expression: "default" } (aceita .png/.webp; sem expressão = default)
export function parsePortrait(value) {
  if (!value) return null;
  const [char, ...rest] = String(value).replace(/\.(png|webp)$/i, "").split("_");
  return { char, expression: rest.join("_") || "default" };
}
