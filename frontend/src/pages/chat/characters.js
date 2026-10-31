// Registro dos personagens selecionáveis no THREADS.
// Para adicionar um (ex.: Joshua na v0.2): uma entrada aqui + os arquivos de ícone (`<id>_icon.webp`
// em public/icons, depois `npm run icons`) + o portrait no backend. O resto da UI se monta sozinho.
//
// id                 -> prefixo do portrait no backend ("neku" -> neku_default, neku_happy...)
// icon               -> nome do ícone sem extensão (public/icons/sm|lg/<icon>.webp); também é o valor salvo em `user.icon`
// previewExpression  -> pose mostrada no portrait da esquerda do THREADS
// description        -> curta e SEM spoiler (rascunho: ajuste com o seu texto)
export const CHARACTERS = [
  {
    id: "neku",
    number: 1,
    name: "Neku Sakuraba",
    short: "NEKU",
    icon: "neku_icon",
    expressions: ["default", "happy", "annoyed", "fight"],
    previewExpression: "happy",
    description:
      "A headphone-wearing teenager who keeps the whole world at arm's length. Shibuya has other plans for him.",
  },
  {
    id: "shiki",
    number: 2,
    name: "Shiki Misaki",
    short: "SHIKI",
    icon: "shiki_icon",
    expressions: ["default", "happy", "annoyed", "fight"],
    previewExpression: "happy",
    description:
      "Shiki as she is seen in the UG. Outgoing, fashion-obsessed and fiercely loyal, with a bond to her best friend Eri that follows her everywhere.",
  },
];

export const characterOf = (id) => CHARACTERS.find((c) => c.id === id) ?? null;

// valor salvo em `user.portrait` ao equipar (a expressão da conversa continua sendo "default")
export const portraitValue = (c) => `${c.id}_default`;
