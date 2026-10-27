import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "./chatStore";
import { errorText } from "./errors";
import SocialGraph from "./SocialGraph";
import ProfilePanel from "./ProfilePanel";
import ActionBar from "./ActionBar";
import SendIcon from "./SendIcon";
import { useSocialUi } from "./socialUiStore";


let profileHiddenMemo = false; // lembra o Hide Profile enquanto a página não recarrega

function actionsFor(c) {
  switch (c.status) {
    case "friend":       return ["open", "remove"];
    case "pending_in":   return ["open", "accept", "decline"];
    case "pending_out":  return c.unlocked ? ["open"] : [];
    case "disconnected": return ["open", "close"];
    default:             return [];
  }
}

export default function SocialNetworkTab() {
  const navigate = useNavigate();
  const me = useChatStore((s) => s.me);
  const contacts = useChatStore((s) => s.contacts);
  const list = useMemo(() => Object.values(contacts), [contacts]);
  const [selected, setSelected] = useState(() => useSocialUi.getState().selectedId);
  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState("");
  const [profileHidden, setProfileHidden] = useState(profileHiddenMemo);
  const toggleProfile = () =>
    setProfileHidden((h) => {
      profileHiddenMemo = !h;
      return !h;
    });

  // o contato selecionado sumiu (decline/close/etc.): limpa a seleção
  useEffect(() => {
    if (selected && selected !== "me" && !contacts[selected]) setSelected(null);
  }, [selected, contacts]);

  const current = selected && selected !== "me" ? contacts[selected] : null;
  const person = selected === "me" ? me : current;

  async function run(key) {
    if (!current) return;
    const st = useChatStore.getState();
    setError("");
    try {
      if (key === "open") navigate(`/chat/${await st.openDM(current.conversationId)}`);
      if (key === "accept") await st.accept(current.conversationId);
      if (key === "decline") { await st.decline(current.conversationId); setSelected(null); }
      if (key === "remove") await st.removeFriend(current.conversationId);
      if (key === "close") { await st.closeDM(current.conversationId); setSelected(null); }
    } catch (e) {
      setError(errorText(e.code));
    }
  }

  async function add(e) {
    e.preventDefault();
    if (!playerId.trim()) return;
    setError("");
    try {
      await useChatStore.getState().sendRequest(playerId);
      setPlayerId("");
    } catch (err) {
      setError(errorText(err.code));
    }
  }

  return (
    <div className="social">
      <SocialGraph
        contacts={list} me={me} selectedId={selected} onSelect={setSelected}
        panelOpen={!profileHidden}
      />
      {!profileHidden && <ProfilePanel person={person} isMe={selected === "me"} />}

      <form className="addbar" onSubmit={add}>
        <label htmlFor="player-id">You can add a player with their Player ID.</label>
        <div className="addbar__row">
          <input
            id="player-id"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            placeholder="Enter a Player ID"
            autoComplete="off"
          />
          <button type="submit" aria-label="Send friend request"><SendIcon /></button>
        </div>
        {error && <p className="addbar__error">{error}</p>}
      </form>

      <ActionBar
        keys={current ? actionsFor(current) : []}
        onAction={run}
        profile={{ available: !!person, hidden: profileHidden, onToggle: toggleProfile }}
      />
    </div>
  );
}