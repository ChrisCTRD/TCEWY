import { parsePortrait } from "./assets";

// Preset por tipo de balão.
// `expression` força a expressão do portrait enquanto o balão for a ÚLTIMA mensagem da pessoa;
// ao chegar uma mensagem comum, volta a pose que ela tem selecionada.
export const BALLOON_PRESETS = {
  round: {},
  scribble: { expression: "annoyed" },
};

// balões escolhíveis no TalkMenu (scribble é uma AÇÃO: envia na hora, não entra no compose)
export const SELECTABLE_BALLOONS = ["round", "scribble"];

export const lastBy = (messages, playerId) => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].senderPlayerId === playerId) return messages[i];
  }
  return null;
};

// devolve a pessoa com a pose "efetiva" (forçada pelo balão ou a selecionada)
export function withPose(person, lastMsg) {
  // o balão pode forçar a pose (scribble -> annoyed); senão vale a expressão que veio na mensagem
  const expression = lastMsg && (BALLOON_PRESETS[lastMsg.balloon]?.expression ?? lastMsg.expression);
  const char = parsePortrait(person?.portrait)?.char;
  return expression && char ? { ...person, portrait: `${char}_${expression}` } : person;
}