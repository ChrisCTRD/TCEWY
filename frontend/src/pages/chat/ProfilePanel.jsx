import { useEffect, useRef, useState } from "react";
import { usePortrait } from "./usePortrait";

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "???");

export default function ProfilePanel({ person, isMe }) {
  const art = usePortrait(person?.portrait, "default");

  // quem está selecionado mudou -> o portrait entra de fora da tela com um bounce.
  // Montar o painel (abrir o Menu, Show Profile) não anima: só trocar de pessoa.
  const id = person ? (isMe ? "me" : person.conversationId ?? person.playerId) : null;
  const prevId = useRef(id);
  const [enter, setEnter] = useState(0);
  useEffect(() => {
    if (prevId.current === id) return;
    prevId.current = id;
    if (id) setEnter((n) => n + 1);
  }, [id]);

  if (!person) return null;

  const hideOnError = (e) => (e.currentTarget.style.display = "none");

  return (
    <aside className="profile">
      {art && (
        <>
          {/* camada 1: portrait com a sombra colorida atrás */}
          <img
            key={`art-${enter}`}
            className="profile__art"
            data-enter={enter > 0 || undefined}
            src={art}
            alt=""
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onError={hideOnError}
          />
          {/* camada 2: mesma imagem em silhueta preta, aparecendo só embaixo = fade de preto no portrait */}
          <img
            key={`shade-${enter}`}
            className="profile__art profile__art--shade"
            data-enter={enter > 0 || undefined}
            src={art}
            alt=""
            aria-hidden="true"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onError={hideOnError}
          />
        </>
      )}
      <h2 className="profile__name">{person.displayName ?? person.playerId}</h2>
      <p className="profile__bio">{person.bio || "..."}</p>
      {!isMe && (
        <>
          <h3 className="profile__label">TIMEFRAME</h3>
          <p className="profile__date">{fmt(person.friendsSince ?? person.createdAt)}</p>
        </>
      )}
    </aside>
  );
}