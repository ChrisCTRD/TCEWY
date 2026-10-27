import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "./chatStore";
import { canSend } from "./chatRules";
import { lastBy, withPose } from "./balloonPresets";
import Portrait from "./Portrait";
import Balloon from "./Balloon";
import "./talk.css";

const EMPTY = [];
const FX_DIR = "/overlay"; // pasta de other002_01.png ... other002_10.png dentro de public/

export default function TalkLayer({ conversationId, blurred }) {
  const navigate = useNavigate();
  const me = useChatStore((s) => s.me);
  const contact = useChatStore((s) => s.contacts[conversationId]);
  const messages = useChatStore((s) => s.messages[conversationId] ?? EMPTY);
  const loaded = useChatStore((s) => s.messages[conversationId] !== undefined);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const [draft, setDraft] = useState("");

  // overlay fixo por conversa (01–10), derivado do id para não trocar a cada render
  const fx = useMemo(() => {
    let h = 0;
    for (const ch of String(conversationId ?? "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return String((h % 10) + 1).padStart(2, "0");
  }, [conversationId]);

  const hasContact = !!contact;
  useEffect(() => {
    if (conversationId && hasContact && !loaded) loadMessages(conversationId);
  }, [conversationId, hasContact, loaded, loadMessages]);

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
    <section className="talk dm" data-blurred={blurred} aria-hidden={blurred}>
      <div className="dm__bg" aria-hidden="true" />
      <div className="dm__fx" aria-hidden="true" style={{ backgroundImage: `url("${FX_DIR}/other002_${fx}.png")` }} />

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
