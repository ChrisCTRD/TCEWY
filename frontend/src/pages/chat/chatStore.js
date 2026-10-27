import { create } from "zustand";
import { api } from "./api";
import { connectSocket, getSocket, disconnectSocket } from "./socket";
import { useSocialUi } from "./socialUiStore";

const initial = {
  ready: false,
  offline: false,
  authFailed: false,
  me: null,
  contacts: {},            // conversationId -> contato
  messages: {},            // conversationId -> mensagens (ordem cronológica)
  cursors: {},             // conversationId -> { hasMore, nextBefore }
  notices: [],             // avisos para o Mental Notes
  openConversationId: null, // conversa em foco (Menu fechado)
  lastConversationId: null, // fundo desfocado do Menu
};

let initPromise = null;
const loading = new Set();

const omit = (obj, key) => {
  const { [key]: _, ...rest } = obj;
  return rest;
};

const upsert = (list, m) => {
  const i = list.findIndex((x) => x.id === m.id || (m.clientId && x.clientId === m.clientId));
  if (i === -1) return [...list, m];
  const next = [...list];
  next[i] = m;
  return next;
};

const fromRequest = (r, status) => ({
  conversationId: r.conversationId,
  playerId: r.playerId,
  displayName: r.displayName,
  bio: r.bio,
  role: r.role,
  portrait: r.portrait,
  icon: r.icon,
  background: r.background,
  status,
  unlocked: r.unlocked ?? false,
  unreadCount: 0,
  lastMessageAt: null,
  friendsSince: null,
  createdAt: r.createdAt, // TIMEFRAME de pendentes: friendsSince ?? createdAt
});

async function fetchAll() {
  const [{ user }, { friends }, { conversations }, { incoming, outgoing }] = await Promise.all([
    api.me(), api.friends(), api.conversations(), api.requests(),
  ]);
  const contacts = {};
  for (const f of friends)
    contacts[f.conversationId] = { ...f, status: "friend", unlocked: true, unreadCount: 0, lastMessageAt: null };
  for (const c of conversations)
    contacts[c.conversationId] = { ...contacts[c.conversationId], ...c };
  for (const r of incoming)
    contacts[r.conversationId] = { ...fromRequest(r, "pending_in"), ...contacts[r.conversationId], requestId: r.id };
  for (const r of outgoing)
    contacts[r.conversationId] = { ...fromRequest(r, "pending_out"), ...contacts[r.conversationId], requestId: r.id };
  return { me: user, contacts };
}

export const useChatStore = create((set, get) => {
  const patchContact = (id, patch) =>
    set((s) => (s.contacts[id] ? { contacts: { ...s.contacts, [id]: { ...s.contacts[id], ...patch } } } : s));
  const addNotice = (n) =>
    set((s) => ({ notices: [{ id: crypto.randomUUID(), at: new Date().toISOString(), ...n }, ...s.notices] }));

  function bindSocket() {
    const s = connectSocket();

    s.on("message:new", (m) => get()._onMessage(m));

    s.on("message:deleted", ({ id, conversationId }) =>
      set((st) =>
        st.messages[conversationId]
          ? {
              messages: {
                ...st.messages,
                [conversationId]: st.messages[conversationId].map((m) =>
                  m.id === id ? { ...m, deleted: true, balloon: "scribble", text: "" } : m
                ),
              },
            }
          : st
      )
    );

    s.on("friend:request", (r) => {
      set((st) => ({
        contacts: { ...st.contacts, [r.conversationId]: { ...fromRequest(r, "pending_in"), requestId: r.id } },
      }));
      addNotice({ type: "friend_request", conversationId: r.conversationId, playerId: r.playerId });
    });

    s.on("friend:accepted", (c) =>
      set((st) => ({
        contacts: {
          ...st.contacts,
          [c.conversationId]: { ...st.contacts[c.conversationId], ...c, status: "friend", unlocked: true, requestId: undefined },
        },
      }))
    );

    s.on("friend:removed", ({ conversationId }) => patchContact(conversationId, { status: "disconnected" }));

    s.on("friend:declined", ({ id }) =>
      set((st) => {
        const entry = Object.values(st.contacts).find((c) => c.requestId === id);
        return entry ? { contacts: omit(st.contacts, entry.conversationId) } : st;
      })
    );

    s.on("dm:unlocked", ({ conversationId, fromPlayerId }) => {
      patchContact(conversationId, { unlocked: true });
      addNotice({ type: "dm_unlocked", conversationId, playerId: fromPlayerId });
    });

    s.on("connect_error", (e) => {
      if (e.message === "UNAUTHORIZED") set({ authFailed: true });
    });

    // ressincroniza depois de uma queda de conexão
    s.io.on("reconnect", async () => {
      try {
        const data = await fetchAll();
        useSocialUi.getState().load(data.me.playerId);
        set({ ...data, messages: {}, cursors: {} });
      } catch {}
    });
  }

  return {
    ...initial,

    init: () =>
      (initPromise ??= (async () => {
        try {
          const data = await fetchAll();
          set({ ...data, ready: true, offline: false });
          bindSocket();
        } catch (e) {
          initPromise = null;
          if (e.code === "UNAUTHORIZED") set({ authFailed: true });
          else set({ ready: true, offline: true });
        }
      })()),

    reset: () => {
      disconnectSocket();
      useSocialUi.getState().clear();
      initPromise = null;
      set({ ...initial });
    }, // chame no botão de logout

    setOpenConversation: (id) => {
      set((s) => ({
        openConversationId: id,
        lastConversationId: id ?? s.lastConversationId,
      }));
      const c = id && get().contacts[id];
      if (c && c.unreadCount > 0) {
        patchContact(id, { unreadCount: 0 });
        api.markRead(id).catch(() => {});
      }
    },

    // ---------- mensagens ----------
    async loadMessages(id, older = false) {
      if (loading.has(id)) return;
      loading.add(id);
      try {
        const before = older ? get().cursors[id]?.nextBefore : undefined;
        const { messages, hasMore, nextBefore } = await api.messages(id, before);
        const chrono = [...messages].reverse();
        set((s) => {
          const cur = s.messages[id] ?? [];
          const merged = older
            ? [...chrono, ...cur]
            : [...chrono, ...cur.filter((m) => !chrono.some((x) => x.id === m.id || (m.clientId && x.clientId === m.clientId)))]
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          return {
            messages: { ...s.messages, [id]: merged },
            cursors: { ...s.cursors, [id]: { hasMore, nextBefore } },
          };
        });
        if (!older && get().openConversationId === id) patchContact(id, { unreadCount: 0 });
      } catch {
        // conversa inacessível: o AppShell cuida do redirect quando o contato some
      } finally {
        loading.delete(id);
      }
    },

    sendMessage(conversationId, text, balloon = "round") {
      const { me } = get();
      const clientId = crypto.randomUUID();
      const temp = {
        id: `tmp-${clientId}`, conversationId, senderPlayerId: me.playerId,
        text, balloon, deleted: false, createdAt: new Date().toISOString(),
        clientId, sending: true,
      };
      set((s) => ({ messages: { ...s.messages, [conversationId]: upsert(s.messages[conversationId] ?? [], temp) } }));

      getSocket().emit("message:send", { conversationId, text, balloon, clientId }, (ack) => {
        set((s) => {
          const list = s.messages[conversationId] ?? [];
          const final = ack.ok ? ack.message : { ...temp, sending: false, failed: true, errorCode: ack.error?.code };
          return { messages: { ...s.messages, [conversationId]: upsert(list, final) } };
        });
        if (!ack.ok && ack.error?.code === "CONNECTION_LOST") patchContact(conversationId, { status: "disconnected" });
      });
    },

    _onMessage(m) {
      const { me, openConversationId } = get();
      const mine = m.senderPlayerId === me.playerId;
      const isOpen = openConversationId === m.conversationId;
      set((s) => {
        const cur = s.contacts[m.conversationId];
        if (!cur) return s;
        return {
          messages: s.messages[m.conversationId]
            ? { ...s.messages, [m.conversationId]: upsert(s.messages[m.conversationId], m) }
            : s.messages,
          contacts: {
            ...s.contacts,
            [m.conversationId]: {
              ...cur,
              lastMessageAt: m.createdAt,
              unreadCount: mine || isOpen ? cur.unreadCount : cur.unreadCount + 1,
            },
          },
        };
      });
      if (!mine && isOpen) api.markRead(m.conversationId).catch(() => {});
    },

    // ---------- relacionamento (todas lançam ApiError; quem chama mostra errorText) ----------
    async sendRequest(playerId) {
      const { request } = await api.sendRequest(playerId.trim());
      set((s) => ({
        contacts: { ...s.contacts, [request.conversationId]: { ...fromRequest(request, "pending_out"), requestId: request.id } },
      }));
    },

    async accept(id) {
      const c = get().contacts[id];
      const { friend } = await api.accept(c.requestId);
      patchContact(id, { ...friend, status: "friend", unlocked: true, requestId: undefined });
    },

    async decline(id) {
      const c = get().contacts[id];
      await api.decline(c.requestId);
      set((s) => ({
        contacts: omit(s.contacts, id),
        messages: omit(s.messages, id),
        lastConversationId: s.lastConversationId === id ? null : s.lastConversationId,
      }));
    },

    async removeFriend(id) {
      await api.removeFriend(get().contacts[id].playerId);
      patchContact(id, { status: "disconnected" });
    },

    async openDM(id) {
      const c = get().contacts[id];
      // desconectado e pending_in abrem direto; amigo e pending_out destravado reabrem pela API
      if (c.status === "disconnected" || c.status === "pending_in") return id;
      const { conversation } = await api.openDM(c.playerId);
      patchContact(id, conversation);
      return id;
    },

    async closeDM(id) {
      const c = get().contacts[id];
      await api.closeDM(id);
      set((s) => ({
        // amigo continua na lista; desconectado some de vez
        contacts: c.status === "friend" ? { ...s.contacts, [id]: { ...c, unreadCount: 0 } } : omit(s.contacts, id),
        messages: omit(s.messages, id),
        cursors: omit(s.cursors, id),
        lastConversationId: s.lastConversationId === id ? null : s.lastConversationId,
      }));
    },
  };
});