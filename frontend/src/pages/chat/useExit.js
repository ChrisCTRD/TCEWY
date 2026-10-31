import { useCallback, useEffect, useRef, useState } from "react";

// Saída animada de painéis (TalkMenu, ChatLog): `close()` liga data-closing (o CSS toca a animação de saída)
// e só depois chama onClose. Espalhe `rootProps` no elemento raiz do painel.
export function useExit(onClose) {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const cb = useRef(onClose);
  cb.current = onClose;

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
  }, []);

  // rede de segurança: sem animação (reduced-motion) ou sem animationend, fecha mesmo assim
  useEffect(() => {
    if (!closing) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => cb.current(), reduce ? 0 : 450);
    return () => clearTimeout(t);
  }, [closing]);

  const rootProps = {
    "data-closing": closing || undefined,
    onAnimationEnd: (e) => {
      if (closingRef.current && e.target === e.currentTarget) cb.current();
    },
  };
  return { closing, close, closingRef, rootProps };
}
