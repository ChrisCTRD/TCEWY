const Conversation = require('../models/Conversation')
const Friendship = require('../models/Friendship')
const Message = require('../models/Message')
const User = require('../models/User')
const { makePairKey } = require('../utils/pairKey')
const { isObjectId } = require('../utils/validators')
const { errors } = require('../utils/AppError')
const { toPublicUser, iso } = require('../utils/serializers')

// Relationship state from the viewer's point of view.
const computeStatus = (friendship, userId) => {
  if (!friendship) return null
  if (friendship.status === 'accepted') return 'friend'
  if (friendship.status === 'removed') return 'disconnected'
  if (friendship.status === 'pending') {
    return String(friendship.recipient) === String(userId) ? 'pending_in' : 'pending_out'
  }
  return null
}

// Has the DM ever been opened up between this pair? (Conversation.firstUnlockedAt, permanent.)
// Accepted/removed friendships count too, so conversations created before this marker existed keep working.
const isUnlocked = (conversation, friendship) => Boolean(
  (conversation && conversation.firstUnlockedAt) ||
  (friendship && (friendship.status === 'accepted' || friendship.status === 'removed'))
)

// Per-user state of a conversation (see Conversation model).
const stateOf = (conversation, userId) => {
  const raw = conversation.states && conversation.states.get(String(userId))
  return {
    closed: Boolean(raw && raw.closed),
    closedAt: (raw && raw.closedAt) || null,
    lastReadAt: (raw && raw.lastReadAt) || null
  }
}

// Atomically sets fields of the per-user state for one or more users, e.g.
//   updateStates(convId, [a, b], { closed: true, closedAt: now })
const updateStates = (conversationId, userIds, fields) => {
  const $set = {}
  for (const userId of userIds) {
    for (const [field, value] of Object.entries(fields)) $set[`states.${userId}.${field}`] = value
  }
  return Conversation.updateOne({ _id: conversationId }, { $set })
}

// Pure: decides what `userId` may do in `conversation` given the friendship.
//   canRead -> may open the DM and read the history (after their own cutoff)
//   canSend -> may also send (disconnected is read-only)
const buildAccess = (conversation, friendship, userId) => {
  const isParticipant = conversation.participants.some((p) => String(p) === String(userId))
  if (!isParticipant) return null
  const otherId = conversation.participants.find((p) => String(p) !== String(userId))
  const me = stateOf(conversation, userId)
  const other = { id: otherId, ...stateOf(conversation, otherId) }
  const status = computeStatus(friendship, userId)
  const unlocked = isUnlocked(conversation, friendship)
  const canRead = status !== null && !me.closed && (status !== 'pending_out' || unlocked)
  return {
    conversation,
    friendship,
    status,
    unlocked,
    me,
    other,
    canRead,
    canSend: canRead && status !== 'disconnected'
  }
}

// Throws CONVERSATION_NOT_FOUND for "doesn't exist" and "not a participant" alike (no existence leak).
const getAccess = async (userId, conversationId) => {
  if (!isObjectId(conversationId)) throw errors.conversationNotFound()
  const conversation = await Conversation.findById(conversationId)
  if (!conversation) throw errors.conversationNotFound()
  const friendship = await Friendship.findOne({ pairKey: conversation.pairKey })
  const access = buildAccess(conversation, friendship, userId)
  if (!access) throw errors.conversationNotFound()
  return access
}

// Same 404 for "locked", "closed" and "nonexistent".
const requireReadable = (access) => {
  if (!access.canRead) throw errors.conversationNotFound()
  return access
}

// Conversations the user can currently see (not closed, not a locked pending_out).
const listVisibleEntries = async (userId) => {
  const conversations = await Conversation.find({ participants: userId })
  if (!conversations.length) return []
  const friendships = await Friendship.find({ pairKey: { $in: conversations.map((c) => c.pairKey) } })
  const byKey = new Map(friendships.map((f) => [f.pairKey, f]))
  return conversations
    .map((c) => buildAccess(c, byKey.get(c.pairKey), userId))
    .filter((access) => access && access.canRead)
}

// Creates the conversation for a pair (or returns the existing one — it is reused forever).
const ensureConversation = async (userA, userB) => {
  const pairKey = makePairKey(userA, userB)
  const insert = {
    participants: [userA, userB],
    states: Object.fromEntries(
      [userA, userB].map((id) => [String(id), { closed: false, closedAt: null, lastReadAt: null }])
    )
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await Conversation.findOneAndUpdate(
        { pairKey },
        { $setOnInsert: insert },
        { upsert: true, returnDocument: 'after' }
      )
    } catch (err) {
      if (err.code !== 11000) throw err // two requests raced the upsert: retry and read the winner
    }
  }
  return Conversation.findOne({ pairKey })
}

const latestDate = (a, b) => {
  if (a && b) return a > b ? a : b
  return a || b || null
}

// Builds the GET /conversations items for a list of access entries.
const buildConversationItems = async (entries) => {
  if (!entries.length) return []
  const users = await User.find({ _id: { $in: entries.map((e) => e.other.id) } })
  const usersById = new Map(users.map((u) => [String(u._id), u]))

  const rows = await Promise.all(entries.map(async (entry) => {
    const otherUser = usersById.get(String(entry.other.id))
    if (!otherUser) return null

    const since = latestDate(entry.me.lastReadAt, entry.me.closedAt)
    const unreadCount = await Message.countDocuments({
      conversationId: entry.conversation._id,
      senderId: entry.other.id,
      deletedAt: null,
      ...(since ? { createdAt: { $gt: since } } : {})
    })

    const cutoff = entry.me.closedAt
    const last = entry.conversation.lastMessageAt
    const visibleLast = last && (!cutoff || last > cutoff) ? last : null

    return {
      sortKey: (visibleLast || entry.conversation.createdAt).getTime(),
      item: {
        conversationId: String(entry.conversation._id),
        ...toPublicUser(otherUser),
        status: entry.status,
        unlocked: entry.unlocked,
        unreadCount,
        lastMessageAt: iso(visibleLast),
        friendsSince: entry.status === 'friend' ? iso(entry.friendship.acceptedAt) : null
      }
    }
  }))

  return rows
    .filter(Boolean)
    .sort((a, b) => b.sortKey - a.sortKey)
    .map((row) => row.item)
}

// Everyone who can see this user in their lists (friend, pending_in, pending_out, disconnected).
// Unions Friendship and Conversation so a contact is never missed.
const listCounterpartIds = async (userId) => {
  const [friendships, conversations] = await Promise.all([
    Friendship.find({ $or: [{ requester: userId }, { recipient: userId }] }).select('requester recipient'),
    Conversation.find({ participants: userId }).select('participants')
  ])
  const ids = new Set()
  for (const f of friendships) ids.add(String(f.requester)).add(String(f.recipient))
  for (const c of conversations) c.participants.forEach((p) => ids.add(String(p)))
  ids.delete(String(userId))
  return [...ids]
}

module.exports = {
  computeStatus,
  isUnlocked,
  updateStates,
  buildAccess,
  getAccess,
  requireReadable,
  listVisibleEntries,
  ensureConversation,
  buildConversationItems,
  listCounterpartIds
}
