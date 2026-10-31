const iso = (date) => (date ? new Date(date).toISOString() : null)

const toPublicUser = (user) => ({
  playerId: user.playerId,
  displayName: user.displayName,
  bio: user.bio || '',
  role: user.role,
  portrait: user.portrait,
  icon: user.icon,
  background: user.background
})

// Friend / contact shape (GET /friends, friend:accepted).
const toContact = (user, { conversationId, friendsSince }) => ({
  conversationId: conversationId ? String(conversationId) : null,
  ...toPublicUser(user),
  friendsSince: iso(friendsSince)
})

// Pending request shape (GET /friends/requests, friend:request). `user` is the OTHER person.
// `unlocked` comes from the conversation (see isUnlocked in services/conversations.js).
const toRequestItem = (user, friendship, conversationId, unlocked) => ({
  id: String(friendship._id),
  conversationId: conversationId ? String(conversationId) : null,
  ...toPublicUser(user),
  unlocked: Boolean(unlocked),
  createdAt: iso(friendship.requestedAt)
})

// Deleted messages never leak their text: balloon becomes `scribble`, text is empty.
const toMessage = (message, senderPlayerId) => {
  const deleted = Boolean(message.deletedAt)
  return {
    id: String(message._id),
    conversationId: String(message.conversationId),
    senderPlayerId,
    text: deleted ? '' : message.text,
    balloon: deleted ? 'scribble' : message.balloon,
    expression: message.expression || 'default',
    deleted,
    createdAt: iso(message.createdAt),
    clientId: message.clientId ?? null
  }
}

module.exports = { iso, toPublicUser, toContact, toRequestItem, toMessage }
