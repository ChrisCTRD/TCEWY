import { useEffect, useState } from "react";
import { fetchPortrait } from "./api";
import { parsePortrait } from "./assets";

// value = "neku_default"; stateOverride força um estado (ex.: thoughtful no Mental Notes, redeyes)
export function usePortrait(value, stateOverride) {
  const parsed = parsePortrait(value);
  const char = parsed?.char ?? null;
  const state = stateOverride ?? parsed?.state ?? 0;
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!char) return;
    let cancelled = false;
    fetchPortrait(char, state)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch((err) => {
        console.error("portrait", char, state, err); // pode remover depois dos testes
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [char, state]);

  return char ? url : null;
}