import { useEffect, useRef } from "react";

// Atalhos de teclado do chat (fonte única de input).
//   useKeys({ "KeyW,ArrowUp": fn, Enter: fn, ControlLeft: fn }, enabled, { modal })
//
// - Chaves são `e.code` (posição física: WASD funciona em qualquer layout); alias separado por vírgula.
// - Camadas em pilha: quem ativou por último fica no topo e tem prioridade. Se o topo tem a tecla,
//   só ele a recebe; senão a tecla desce para a camada de baixo.
// - `modal: true` bloqueia as camadas de baixo (e os listeners antigos) para TODAS as teclas simples.
// - O listener roda na fase de captura e chama stopImmediatePropagation quando consome a tecla,
//   então `window.addEventListener("keydown")` antigos (ActionBar, SocialGraph...) não disparam junto.
//   Tecla que nenhuma camada trata segue normalmente para eles, até migrarem para o useKeys.
// - Dentro de input/textarea só passam Esc, Tab, Ctrl esq. e Alt esq. (digitar "e" não abre menu).
// - Ctrl/Alt esquerdos disparam no keyup e só se nenhuma outra tecla foi apertada junto
//   (não atrapalha Ctrl+C/V e impede o Alt sozinho de focar a barra do navegador).
// - Marca <body data-input="kbd|mouse">: o ciano de foco só aparece no modo teclado.
const MODS = new Set(["ControlLeft", "AltLeft"]);
const TYPING_OK = new Set(["Escape", "Tab", "ControlLeft", "AltLeft"]);
const stack = []; // última camada = topo
let modUsed = false;
let installed = false;

const typingIn = (e) => e.target?.closest?.("input, textarea, select, [contenteditable]");

function dispatch(code, e) {
  for (let i = stack.length - 1; i >= 0; i--) {
    const layer = stack[i];
    const fn = layer.find(code);
    if (fn) {
      e.preventDefault();
      e.stopImmediatePropagation();
      fn(e);
      return;
    }
    if (layer.modal) {
      e.stopImmediatePropagation(); // engole a tecla: nada embaixo reage
      return;
    }
  }
}

function install() {
  if (installed) return;
  installed = true;

  window.addEventListener(
    "keydown",
    (e) => {
      document.body.dataset.input = "kbd";
      if (MODS.has(e.code)) {
        modUsed = false;
        return;
      }
      modUsed = true;
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (typingIn(e) && !TYPING_OK.has(e.code)) return;
      dispatch(e.code, e);
    },
    true
  );

  window.addEventListener(
    "keyup",
    (e) => {
      if (!MODS.has(e.code) || modUsed) return;
      for (let i = stack.length - 1; i >= 0; i--) {
        const fn = stack[i].find(e.code);
        if (fn) {
          e.preventDefault(); // Alt sozinho não foca a barra do navegador
          fn(e);
          return;
        }
        if (stack[i].modal) return;
      }
    },
    true
  );

  window.addEventListener("pointermove", () => {
    document.body.dataset.input = "mouse";
  });
}

export function useKeys(bindings, enabled = true, { modal = false } = {}) {
  const ref = useRef(bindings);
  ref.current = bindings; // sempre o handler mais recente (sem closure velha)

  useEffect(() => {
    install();
    if (!enabled) return;
    const layer = {
      modal,
      find: (code) => Object.entries(ref.current).find(([k]) => k.split(",").includes(code))?.[1],
    };
    stack.push(layer);
    return () => {
      stack.splice(stack.indexOf(layer), 1);
    };
  }, [enabled, modal]);
}
