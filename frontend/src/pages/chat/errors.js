const TEXT = {
  PLAYER_NOT_FOUND: "No Player with that ID.",
  CANNOT_ADD_SELF: "You can't add yourself.",
  ALREADY_FRIENDS: "You're already connected.",
  REQUEST_PENDING: "A request is already pending.",
  CONNECTION_LOST: "Connection lost.",
  CONVERSATION_NOT_FOUND: "That thread is gone.",
  RATE_LIMITED: "Slow down!",
  UNAUTHORIZED: "Session expired.",
  INTERNAL_ERROR: "A Noise interfered. Try again.",
};
export const errorText = (code) => TEXT[code] ?? "A Noise interfered. Try again.";