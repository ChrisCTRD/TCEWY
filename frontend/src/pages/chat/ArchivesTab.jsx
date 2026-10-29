import { useEffect, useState } from "react";
import ActionBar from "./ActionBar";
import LogoutConfirm from "./LogoutConfirm";
import { useSocialUi } from "./socialUiStore";
import "./archives.css";

const NO_KEYS = [];
const noop = () => {};

// Opções da sub-aba SETTINGS. v0.1: só o Log Out; para adicionar outra, é só incluir aqui.
const OPTIONS = [
  {
    id: "logout",
    label: "Log Out",
    title: "Log Out",
    desc: "Sign out of your account on this device. Your friends and conversations stay safe on your account, and you can log back in whenever you want.",
  },
];

function logout() {
  try { localStorage.removeItem("token"); } catch { /* sem storage: segue assim mesmo */ }
  useSocialUi.getState().clear();
  // recarrega a página inteira de propósito: zera o chatStore e fecha o socket sem precisar de reset manual
  window.location.assign("/");
}

function Settings() {
  const [index, setIndex] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const current = OPTIONS[index];

  const run = (o) => {
    if (o.id === "logout") setConfirm(true);
  };

  // teclado da lista (setas + Enter); fica desligado enquanto a confirmação está aberta
  useEffect(() => {
    if (confirm) return;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, OPTIONS.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && !e.target.closest?.("button")) {
        e.preventDefault();
        run(OPTIONS[index]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm, index]);

  return (
    <>
      <div className="archives__stage">
        <div className="arc-list">
          {OPTIONS.map((o, i) => (
            <button
              key={o.id}
              type="button"
              className="arc-row"
              data-active={i === index}
              onMouseEnter={() => setIndex(i)}
              onClick={() => run(o)}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* container da direita: rola quando entrarem mais configurações */}
        <section className="arc-pane" aria-live="polite">
          <h3 className="arc-pane__title">{current.title}</h3>
          <p className="arc-pane__desc">{current.desc}</p>
        </section>
      </div>

      {confirm && <LogoutConfirm onCancel={() => setConfirm(false)} onConfirm={logout} />}
    </>
  );
}

export default function ArchivesTab({ sub }) {
  return (
    <div className="archives">
      {sub === "settings" ? <Settings /> : <p className="menu__soon">GUIDE</p>}
      {/* só o Back (Espaço) por enquanto; as ações da aba entram aqui depois */}
      <ActionBar keys={NO_KEYS} onAction={noop} />
    </div>
  );
}
