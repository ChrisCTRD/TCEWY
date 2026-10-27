export const canOpenDM = (c) =>
  c.status === "friend" ||
  c.status === "disconnected" ||
  c.status === "pending_in" ||
  (c.status === "pending_out" && c.unlocked);

export const canSend = (c) =>
  c.status === "friend" ||
  c.status === "pending_in" ||
  (c.status === "pending_out" && c.unlocked);