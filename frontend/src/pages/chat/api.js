const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const portraitCache = new Map();
export const getToken = () => localStorage.getItem("token");

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data.error ?? {};
    throw new ApiError(e.code ?? "INTERNAL_ERROR", e.message ?? data.message ?? "Request failed", res.status);
  }
  return data;
}

export function fetchPortrait(char, state = 0) {
  const key = `${char}:${state}`;
  if (!portraitCache.has(key)) {
    const p = fetch(`${BASE}/api/portraits?char=${encodeURIComponent(char)}&s=${state}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new ApiError("PORTRAIT_FAILED", "Portrait unavailable", res.status);
        return URL.createObjectURL(await res.blob());
      })
      .catch((err) => {
        portraitCache.delete(key); // permite tentar de novo depois
        throw err;
      });
    portraitCache.set(key, p);
  }
  return portraitCache.get(key);
}

export const api = {
  me: () => request("/me"),
  friends: () => request("/friends"),
  conversations: () => request("/conversations"),
  requests: () => request("/friends/requests"),
  sendRequest: (playerId) => request("/friends/requests", { method: "POST", body: { playerId } }),
  accept: (id) => request(`/friends/requests/${id}/accept`, { method: "POST" }),
  decline: (id) => request(`/friends/requests/${id}/decline`, { method: "POST" }),
  removeFriend: (playerId) => request(`/friends/${encodeURIComponent(playerId)}`, { method: "DELETE" }),
  openDM: (playerId) => request("/conversations/open", { method: "POST", body: { playerId } }),
  closeDM: (id) => request(`/conversations/${id}/close`, { method: "POST" }),
  markRead: (id) => request(`/conversations/${id}/read`, { method: "POST" }),
  messages: (id, before) =>
    request(`/conversations/${id}/messages?limit=50${before ? `&before=${before}` : ""}`),
};