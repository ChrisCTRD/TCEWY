import { useEffect, useRef, useState } from "react";
import ChatNavbar from "./ChatNavbar";
import SocialNetworkTab from "./SocialNetworkTab";

// ordem das "telas" da esquerda para a direita (define o sentido do efeito)
const ORDER = ["threads", "thoughts/social", "thoughts/mental", "archive"];
const TABS = ["threads", "thoughts", "archive"]; // abas do topo, em ordem (para Q/W em loop)
const WIPE_MS = 300; // precisa bater com a duração no CSS
const keyOf = (v) => (v.tab === "thoughts" ? `thoughts/${v.sub}` : v.tab);

// lado do bounce da seta: THREADS = esquerda, ARCHIVE = direita, THOUGHTS = sentido de onde veio
function bounceDir(from, to) {
  if (to === "threads") return "left";
  if (to === "archive") return "right";
  return TABS.indexOf(to) > TABS.indexOf(from) ? "right" : "left";
}

export default function MenuOverlay({ open }) {
  const [view, setView] = useState({ tab: "thoughts", sub: "social" });
  const [wipe, setWipe] = useState(null); // { dir } enquanto o efeito roda
  const [bounce, setBounce] = useState(null); // { dir, n } da seta da navbar
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  // forceDir: sentido do efeito imposto por Q/W/setas (vale também no loop ARCHIVE <-> THREADS)
  function go(next, forceDir) {
    if (wipe || keyOf(next) === keyOf(view)) return;
    if (next.tab !== view.tab) {
      setBounce((b) => ({ dir: bounceDir(view.tab, next.tab), n: (b?.n ?? 0) + 1 }));
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setView(next);
      return;
    }
    const dir = forceDir ?? (ORDER.indexOf(keyOf(next)) > ORDER.indexOf(keyOf(view)) ? "ltr" : "rtl");
    setWipe({ dir });
    // troca o conteúdo no meio do efeito, quando a tela está toda preta
    timer.current = setTimeout(() => setView(next), WIPE_MS / 2);
  }

  // troca de aba em loop: delta -1 (esquerda) / +1 (direita)
  function cycle(delta) {
    const i = TABS.indexOf(view.tab);
    // direita (W / seta ») = faixa da esquerda para a direita; esquerda (Q / seta «) = ao contrário
    go({ ...view, tab: TABS[(i + delta + TABS.length) % TABS.length] }, delta > 0 ? "ltr" : "rtl");
  }

  // atalhos: Q = esquerda, W = direita (o Espaço = BACK fica no ActionBar)
  const keys = useRef();
  keys.current = { cycle };
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest?.("input, textarea, select, [contenteditable]")) return; // não atrapalha a digitação
      if (e.code === "KeyQ") keys.current.cycle(-1);
      else if (e.code === "KeyW") keys.current.cycle(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav className="menu" data-open={open} aria-hidden={!open}>
      {/* moldura preta: o retângulo cinza (janela) fica vazado e mostra a conversa desfocada */}
      <div className="menu__fx" aria-hidden="true" />
      <div className="menu__frame" aria-hidden="true" />
      <div className="menu__band" aria-hidden="true" />
      <div className="menu__body">
        {view.tab === "thoughts" && view.sub === "social" && <SocialNetworkTab />}
        {view.tab === "thoughts" && view.sub === "mental" && <p className="menu__soon">MENTAL NOTES</p>}
        {view.tab !== "thoughts" && <p className="menu__soon">{view.tab.toUpperCase()}</p>}
      </div>

      <ChatNavbar
        tab={view.tab}
        sub={view.sub}
        bounce={bounce}
        onCycle={cycle}
        onTab={(tab) => go({ ...view, tab })}
        onSub={(sub) => go({ tab: "thoughts", sub })}
      />

      {wipe && <div className="wipe" data-dir={wipe.dir} onAnimationEnd={() => setWipe(null)} />}
    </nav>
  );
}
