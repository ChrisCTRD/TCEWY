import { useEffect, useState } from "react";
import { fetchPortrait } from "./api";
import { parsePortrait } from "./assets";

// value = "neku_default"; expressionOverride força uma expressão pelo nome (ex.: "thoughtful", "redeyes")
export function usePortrait(value, expressionOverride) {
  const parsed = parsePortrait(value);
  const char = parsed?.char ?? null;
  const expression = expressionOverride ?? parsed?.expression ?? "default";
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!char) return;
    let cancelled = false;
    fetchPortrait(char, expression)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch((err) => {
        console.error("portrait", char, expression, err); // pode remover depois dos testes
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [char, expression]);

  return char ? url : null;
}
