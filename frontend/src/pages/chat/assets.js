// Ícones dos personagens (chibis). Os originais 2048x2048 ficam em public/icons; `npm run icons` gera
// as versões leves que a UI realmente carrega.
export const iconSm = (id) => `/icons/sm/${id}.webp`;
export const iconLg = (id) => `/icons/lg/${id}.webp`;

// ícone do nó: sem ícone configurado, usa o empty.png
export const iconSrc = (p) =>
  !p?.icon || p.icon === "icon_default" ? "/empty.png" : iconSm(p.icon);

// Overlay fixo por conversa (other002_01 ... other002_10 em public/overlay), derivado do id
// para não trocar a cada render. Fica aqui para o TalkLayer e o pré-carregamento usarem a MESMA conta.
export const FX_DIR = "/overlay";
export function fxId(conversationId) {
  let h = 0;
  for (const ch of String(conversationId ?? "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return String((h % 10) + 1).padStart(2, "0");
}
export const fxUrl = (conversationId) => `${FX_DIR}/other002_${fxId(conversationId)}.png`;

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
