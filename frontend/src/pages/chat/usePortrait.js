import { useEffect, useState } from "react";
import { fetchPortrait, peekPortrait } from "./api";
import { parsePortrait } from "./assets";

// value = "neku_default"; expressionOverride força uma expressão pelo nome (ex.: "thoughtful", "redeyes")
export function usePortrait(value, expressionOverride) {
  const parsed = parsePortrait(value);
  const char = parsed?.char ?? null;
  const expression = expressionOverride ?? parsed?.expression ?? "default";

  // já pré-carregado? usa na hora, no primeiro render (sem esperar o efeito, que causava um frame sem imagem)
  const cached = char ? peekPortrait(char, expression) : null;
  const [fetched, setFetched] = useState(null);

  useEffect(() => {
    if (!char || cached) return;
    let cancelled = false;
    fetchPortrait(char, expression)
      .then((u) => {
        if (!cancelled) setFetched(u);
      })
      .catch((err) => {
        console.error("portrait", char, expression, err); // pode remover depois dos testes
        if (!cancelled) setFetched(null);
      });
    return () => {
      cancelled = true;
    };
  }, [char, expression, cached]);

  return char ? (cached ?? fetched) : null;
}
