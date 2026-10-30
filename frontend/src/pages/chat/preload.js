// Pré-carregamento dos assets do chat. Roda enquanto o Loader está na tela.
import { useChatStore } from "./chatStore";
import { fetchPortrait } from "./api";
import { PORTRAIT_EXPRESSION, fxUrl, iconLg, iconSm, iconSrc, parsePortrait } from "./assets";
import { CHARACTERS } from "./characters";
import { BALLOON_PRESETS } from "./balloonPresets";
import { canOpenDM } from "./chatRules";

const GATE_TIMEOUT_MS = 4000; // se algo travar, o chat abre assim mesmo
const MESSAGES_ON_SCREEN = 2; // só 2 balões aparecem na tela por vez: é tudo que precisa ser buscado

// arquivos que o código referencia direto (as imagens do CSS são descobertas sozinhas, ver collectCssUrls)
const STATIC = [
  "/empty.png",
  "/sphere_flame.svg",
  "/inkbutton.webp",
  "/balloons/nballoontail.webp",
  "/overlay/other002_04.png", // fx do Menu
];

const withTimeout = (p, ms) => Promise.race([p, new Promise((resolve) => setTimeout(resolve, ms))]);

// roda fn em todos os itens, no máximo n por vez (não bombardeia o backend)
async function pool(items, n, fn) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (queue.length) await Promise.resolve(fn(queue.shift())).catch(() => {});
    })
  );
}

// ---------- imagens ----------
// Guarda o <img> já carregado e decodificado: evita baixar duas vezes e mantém a imagem pronta em memória.
const images = new Map();
function loadImage(src) {
  if (images.has(src)) return images.get(src);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = async () => {
      try { await img.decode(); } catch { /* svg sem tamanho próprio etc.: já carregou, segue */ }
      resolve(img);
    };
    img.onerror = () => {
      images.delete(src); // permite tentar de novo depois
      resolve(null);
    };
    img.src = src;
  });
  images.set(src, p);
  return p;
}

// Varre os CSS carregados e devolve toda url() de imagem (balões 9-slice, scribble, pins, fundos...).
// Assim não precisa listar à mão cada arquivo que o chat.css/talk.css/archives.css usa.
const IMG_RE = /\.(png|webp|jpe?g|gif|svg|avif)(\?.*)?$/i;
const URL_RE = /url\(\s*(['"]?)(.*?)\1\s*\)/g;
function collectCssUrls() {
  const found = new Set();
  const walk = (rules, base) => {
    for (const rule of rules) {
      if (rule.cssRules?.length) walk(rule.cssRules, base); // @media etc.
      const text = rule.style?.cssText;
      if (!text) continue;
      for (const m of text.matchAll(URL_RE)) {
        if (!IMG_RE.test(m[2])) continue;
        try { found.add(new URL(m[2], base).href); } catch { /* url inválida: ignora */ }
      }
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      walk(sheet.cssRules, sheet.href ?? document.baseURI);
    } catch { /* folha de outra origem (ex.: Google Fonts): ignora */ }
  }
  return [...found];
}

// ---------- fontes ----------
function loadFonts() {
  if (!document.fonts?.load) return Promise.resolve();
  return Promise.allSettled([
    document.fonts.load('44px "Vandalism"'),
    document.fonts.load('500 1em "M PLUS Rounded 1c"'),
    document.fonts.load('700 1em "M PLUS Rounded 1c"'),
    document.fonts.load('800 1em "M PLUS Rounded 1c"'),
  ]);
}

// ---------- portraits ----------
// fetchPortrait já guarda a promise em cache; depois decodifica o blob para não "pipocar" ao aparecer
const portrait = (char, expression) =>
  fetchPortrait(char, expression).then(loadImage).catch(() => null);

// o essencial de uma pessoa: pose selecionada, default e as poses que os balões podem forçar (ex.: scribble -> annoyed)
function portraitJobs(person) {
  const p = parsePortrait(person?.portrait);
  if (!p) return [];
  const forced = Object.values(BALLOON_PRESETS).map((x) => x.expression).filter(Boolean);
  return [...new Set([p.expression, "default", ...forced])].map((e) => portrait(p.char, e));
}

// ---------- API usada pelo AppShell ----------
let staticPromise = null;

// Começa na hora em que o AppShell monta, em paralelo com a busca dos dados.
export function startStaticPreload() {
  return (staticPromise ??= Promise.allSettled([
    loadFonts(),
    ...[...new Set([...STATIC, ...collectCssUrls()])].map(loadImage),
  ]));
}

// Tudo que a primeira tela precisa; o AppShell segura o Loader até isto terminar (ou estourar o tempo).
export async function preloadGate({ me, contacts, focusId }) {
  const people = [me, ...Object.values(contacts ?? {})].filter(Boolean);
  const jobs = [startStaticPreload()];
  const urls = new Set(people.map(iconSrc)); // ícones dos nós (empty.png quando não há ícone)
  if (focusId) urls.add(fxUrl(focusId)); // overlay da conversa aberta
  for (const u of urls) jobs.push(loadImage(u));
  jobs.push(...people.flatMap(portraitJobs));
  // mensagens da conversa aberta: sem isto os balões só entrariam depois de o Loader sair
  const focus = focusId && contacts?.[focusId];
  if (focus && canOpenDM(focus)) {
    jobs.push(useChatStore.getState().loadMessages(focusId, false, MESSAGES_ON_SCREEN));
  }
  await withTimeout(Promise.allSettled(jobs), GATE_TIMEOUT_MS);
}

// Em segundo plano, depois que o chat abriu: outras poses e overlays das demais conversas.
export function preloadExtras({ me, contacts }) {
  const list = Object.values(contacts ?? {});
  const chars = new Set([me, ...list].map((p) => parsePortrait(p?.portrait)?.char).filter(Boolean));
  for (const c of chars) for (const e of Object.values(PORTRAIT_EXPRESSION)) portrait(c, e);
  for (const c of list) loadImage(fxUrl(c.conversationId));


  // THREADS: só os ícones pequenos de todos; o resto carrega sob demanda (preloadCharacter)
  for (const ch of CHARACTERS) loadImage(iconSm(ch.icon));

  

  // últimas mensagens das demais conversas (3 por vez); as que já estão em memória ficam como estão
  const { messages, loadMessages } = useChatStore.getState();
  const todo = list
    .filter((c) => canOpenDM(c) && messages[c.conversationId] === undefined)
    .map((c) => c.conversationId);
  pool(todo, 3, (id) => loadMessages(id, false, MESSAGES_ON_SCREEN));
}

// THREADS: carrega sob demanda tudo de um personagem (ícone pequeno e grande + todas as poses do portrait).
// Aceita o item de CHARACTERS ou só o id do personagem. loadImage e fetchPortrait têm cache,
// então chamar de novo (ex.: ao passar o mouse no mesmo personagem) não baixa nada duas vezes.
export function preloadCharacter(ch) {
  const entry = typeof ch === "string" ? CHARACTERS.find((c) => c.id === ch) : ch;
  const char = entry?.id; // ajuste se o campo tiver outro nome em characters.js
  if (!entry || !char) return Promise.resolve();
  return Promise.allSettled([
    loadImage(iconSm(entry.icon)),
    loadImage(iconLg(entry.icon)),
    ...Object.values(PORTRAIT_EXPRESSION).map((e) => portrait(char, e)),
  ]);
}

// Contatos que aparecem durante a sessão (pedido de amizade etc.): carrega ícone e portrait na hora.
export function watchNewContacts() {
  const seen = new Set();
  const fresh = (st) => {
    const out = [];
    for (const c of Object.values(st.contacts)) {
      const key = `${c.playerId}|${c.portrait}|${c.icon}`; // trocar de personagem também conta como novidade
      if (!seen.has(key)) {
        seen.add(key);
        out.push(c);
      }
    }
    return out;
  };
  fresh(useChatStore.getState()); // os que já existem contam como vistos
  return useChatStore.subscribe((st) => {
    const novos = fresh(st);
    for (const c of novos) {
      loadImage(iconSrc(c));
      portraitJobs(c);
    }
  });
}
