import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "./chatStore";
import { canSend } from "./chatRules";
import { lastBy, withPose } from "./balloonPresets";
import Portrait from "./Portrait";
import Balloon from "./Balloon";
import "./talk.css";
import { fxUrl } from "./assets";

const EMPTY = [];

// conversas cujo slide de entrada já rodou. Vive no módulo: sobrevive a sair/voltar pro chat,
// e só zera quando a página é recarregada.
const introPlayed = new Set();

export default function TalkLayer({ conversationId, blurred }) {
  const navigate = useNavigate();
  const me = useChatStore((s) => s.me);
  const contact = useChatStore((s) => s.contacts[conversationId]);
  const messages = useChatStore((s) => s.messages[conversationId] ?? EMPTY);
  const loaded = useChatStore((s) => s.messages[conversationId] !== undefined);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const [draft, setDraft] = useState("");
  const fxSrc = useMemo(() => fxUrl(conversationId), [conversationId]);

  const hasContact = !!contact;
  useEffect(() => {
    if (conversationId && hasContact && !loaded) loadMessages(conversationId);
  }, [conversationId, hasContact, loaded, loadMessages]);

  // animação de entrada (portrait + nome): só na primeira vez que esta conversa abre.
  // `intro` fica fixo enquanto a tela está montada.
  const anim = useRef({ id: null, intro: false });
  if (anim.current.id !== conversationId) {
    anim.current = { id: conversationId, intro: !introPlayed.has(conversationId) };
  }
  const intro = anim.current.intro;
  useEffect(() => {
    if (conversationId && hasContact && loaded) introPlayed.add(conversationId);
  }, [conversationId, hasContact, loaded]);

  if (!contact) return <section className="talk" data-blurred={blurred} />;

  const writable = canSend(contact);

  // última mensagem de cada lado: é o que aparece na tela (a DM é "em tempo real")
  const lastThem = lastBy(messages, contact.playerId);
  const lastMe = lastBy(messages, me.playerId);

  // pose efetiva: o balão (ex.: scribble) pode forçar; senão vale a selecionada
  const themPose = withPose(contact, lastThem);
  const mePose = withPose(me, lastMe);
  const recent = messages.slice(-3);

  return (
    <section className="talk dm" data-blurred={blurred} data-intro={intro || undefined} aria-hidden={blurred}>
      <div className="dm__bg" aria-hidden="true" />
      <div className="dm__fx" aria-hidden="true" style={{ backgroundImage: `url("${fxSrc}")` }} />

      <h2 className="dm__name" data-side="them">{contact.displayName ?? contact.playerId}</h2>
      <h2 className="dm__name" data-side="me">{me.displayName ?? me.playerId}</h2>

      <Portrait person={themPose} side="them" />
      <Portrait person={mePose} side="me" />

      {/* fila: novo = slot 0 (embaixo), anterior = 1 (sobe), mais antigo = 2 (sai offscreen) */}
      <div className="dm__balloons">
        {recent.map((m, i) => {
          const slot = recent.length - 1 - i;
          const side = m.senderPlayerId === me.playerId ? "me" : "them";
          return (
            <Balloon
              key={m.clientId ?? m.id}
              message={m}
              side={side}
              slot={slot}
              onEdit={undefined /* TODO: edição por clique (precisa de message:edit no backend) */}
            />
          );
        })}
      </div>

      {/* pins: esquerdo = contato (decorativo), direito = abre o Menu */}
      <span className="dm__pin" data-side="them" aria-hidden="true" />
      <button className="dm__pin" data-side="me" aria-label="Menu" onClick={() => navigate("/chat")} />

      <input
        className="dm__input"
        disabled={!writable}
        value={draft}
        placeholder={writable ? `Message @${contact.playerId}` : "Connection lost."}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            sendMessage(conversationId, draft.trim());
            setDraft("");
          }
        }}
      />
    </section>
  );
}
