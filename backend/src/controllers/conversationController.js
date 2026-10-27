const User = require('../models/User')
const Friendship = require('../models/Friendship')
const Conversation = require('../models/Conversation')
const {
  buildAccess,
  getAccess,
  updateStates,
  listVisibleEntries,
  buildConversationItems
} = require('../services/conversations')
const { getHistory, markRead } = require('../services/messageService')
const { errors } = require('../utils/AppError')
const { makePairKey } = require('../utils/pairKey')
const { parseLookupPlayerId } = require('../utils/validators')
const { iso } = require('../utils/serializers')
const { joinConversation, leaveConversation } = require('../socket/realtime')

// GET /api/conversations  -> { conversations: [item] }
// Everything the user can see right now: friend, pending_in, pending_out (only once unlocked), disconnected.
// Closed conversations and locked pending_out are not listed.
const listConversations = async (req, res) => {
  const entries = await listVisibleEntries(req.me._id)
  res.json({ conversations: await buildConversationItems(entries) })
}

// POST /api/conversations/open  { playerId }  -> { conversation: item }   (OPEN DM)
// Reopens a closed DM (history before the last close stays hidden). Works for friend, pending_in,
// disconnected (unless it was closed) and pending_out once the pair was ever unlocked.
const openConversation = async (req, res) => {
  const me = req.me
  const playerId = parseLookupPlayerId(req.body && req.body.playerId)

  const target = await User.findOne({ playerId })
  if (!target) throw errors.playerNotFound()
  if (String(target._id) === String(me._id)) throw errors.conversationNotFound()

  const pairKey = makePairKey(me._id, target._id)
  const [friendship, conversation] = await Promise.all([
    Friendship.findOne({ pairKey }),
    Conversation.findOne({ pairKey })
  ])
  if (!friendship || !conversation) throw errors.conversationNotFound()

  let access = buildAccess(conversation, friendship, me._id)
  if (!access || access.status === null) throw errors.conversationNotFound()
  if (access.status === 'pending_out' && !access.unlocked) throw errors.conversationNotFound()
  // Disconnected + closed can never be reopened: the other side can no longer write to it.
  if (access.status === 'disconnected' && access.me.closed) throw errors.conversationNotFound()

  if (access.me.closed) {
    await updateStates(conversation._id, [me._id], { closed: false })
    access = buildAccess(await Conversation.findById(conversation._id), friendship, me._id)
  }

  joinConversation(me._id, conversation._id)
  const [item] = await buildConversationItems([access])
  res.json({ conversation: item })
}

// GET /api/conversations/:id/messages?before=<messageId>&limit=50
const getMessages = async (req, res) => {
  const result = await getHistory({
    userId: String(req.me._id),
    playerId: req.me.playerId,
    conversationId: req.params.id,
    before: req.query.before,
    limit: req.query.limit
  })
  res.json(result)
}

// POST /api/conversations/:id/close  -> { ok, conversationId, closedAt }
// Soft close: hides the DM for this user only and sets their history cutoff to now. Nothing is deleted.
const closeConversation = async (req, res) => {
  const access = await getAccess(req.me._id, req.params.id)

  if (access.me.closed) {
    return res.json({ ok: true, conversationId: String(access.conversation._id), closedAt: iso(access.me.closedAt) })
  }

  const closedAt = new Date()
  await updateStates(access.conversation._id, [req.me._id], { closed: true, closedAt })
  leaveConversation(req.me._id, access.conversation._id)

  res.json({ ok: true, conversationId: String(access.conversation._id), closedAt: iso(closedAt) })
}

// POST /api/conversations/:id/read  -> { ok: true }   (clears unreadCount; GET messages page 1 does it too)
const readConversation = async (req, res) => {
  await markRead({ userId: String(req.me._id), conversationId: req.params.id })
  res.json({ ok: true })
}

module.exports = {
  listConversations,
  openConversation,
  getMessages,
  closeConversation,
  readConversation
}
