class AppError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
  }
}

// Codes are part of the API contract (the front translates them) — keep them stable.
const errors = {
  playerNotFound: (message = 'Player not found') => new AppError(404, 'PLAYER_NOT_FOUND', message),
  cannotAddSelf: () => new AppError(400, 'CANNOT_ADD_SELF', 'You cannot add yourself'),
  alreadyFriends: () => new AppError(409, 'ALREADY_FRIENDS', 'You are already friends'),
  requestPending: () => new AppError(409, 'REQUEST_PENDING', 'A friend request is already pending between you two'),
  requestNotFound: () => new AppError(404, 'REQUEST_NOT_FOUND', 'Friend request not found'),
  conversationNotFound: (message = 'Conversation not found') => new AppError(404, 'CONVERSATION_NOT_FOUND', message),
  forbidden: (message = 'Forbidden') => new AppError(403, 'FORBIDDEN', message),
  validation: (message = 'Invalid data') => new AppError(400, 'VALIDATION_ERROR', message),
  rateLimited: () => new AppError(429, 'RATE_LIMITED', 'Too many requests, slow down'),
  connectionLost: () => new AppError(409, 'CONNECTION_LOST', 'You are no longer connected to this player'),
  invalidPortrait: () => new AppError(400, 'INVALID_PORTRAIT', 'Invalid portrait'),
  invalidIcon: () => new AppError(400, 'INVALID_ICON', 'Invalid icon'),
  unauthorized: (message = 'Unauthorized') => new AppError(401, 'UNAUTHORIZED', message)
}

const toErrorPayload = (err) => {
  if (err instanceof AppError) return { code: err.code, message: err.message }
  console.error(err)
  return { code: 'INTERNAL_ERROR', message: 'Internal server error' }
}

module.exports = { AppError, errors, toErrorPayload }
