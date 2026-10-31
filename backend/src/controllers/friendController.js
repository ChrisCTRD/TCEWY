const User = require('../models/User')
const Friendship = require('../models/Friendship')
const Conversation = require('../models/Conversation')
const { ensureConversation, updateStates, isUnlocked } = require('../services/conversations')
const { errors } = require('../utils/AppError')
const { makePairKey } = require('../utils/pairKey')
const { isObjectId, normalizePlayerId, parseLookupPlayerId } = require('../utils/validators')
const { toContact, toRequestItem } = require('../utils/serializers')
const {
  emitToUser,
  joinConversation,
  leaveConversation
} = require('../socket/realtime')

const mineFilter = (userId) => ({ $or: [{ requester: userId }, { recipient: userId }] })
const otherSide = (friendship, userId) =>
  String(friendship.requester) === String(userId) ? friendship.recipient : friendship.requester

const loadUsersById = async (ids) => {
  const users = await User.find({ _id: { $in: ids } })
  return new Map(users.map((u) => [String(u._id), u]))
}

// pairKey -> conversation (only the fields the friend endpoints need)
const loadConversationsByPair = async (pairKeys) => {
  const conversations = await Conversation.find({ pairKey: { $in: pairKeys } }).select('pairKey firstUnlockedAt')
  return new Map(conversations.map((c) => [c.pairKey, c]))
}

// GET /api/friends  -> { friends: [contact] }
const getFriends = async (req, res) => {
  const me = req.me
  const friendships = await Friendship.find({ status: 'accepted', ...mineFilter(me._id) }).sort({ acceptedAt: 1 })
  const users = await loadUsersById(friendships.map((f) => otherSide(f, me._id)))
  const conversations = await loadConversationsByPair(friendships.map((f) => f.pairKey))

  const friends = friendships
    .map((f) => {
      const user = users.get(String(otherSide(f, me._id)))
      if (!user) return null
      const conversation = conversations.get(f.pairKey)
      return toContact(user, { conversationId: conversation && conversation._id, friendsSince: f.acceptedAt })
    })
    .filter(Boolean)

  res.json({ friends })
}

// GET /api/friends/requests  -> { incoming: [request], outgoing: [request] }
const getRequests = async (req, res) => {
  const me = req.me
  const pending = await Friendship.find({ status: 'pending', ...mineFilter(me._id) }).sort({ requestedAt: -1 })
  const users = await loadUsersById(pending.map((f) => otherSide(f, me._id)))
  const conversations = await loadConversationsByPair(pending.map((f) => f.pairKey))

  const incoming = []
  const outgoing = []
  for (const f of pending) {
    const user = users.get(String(otherSide(f, me._id)))
    if (!user) continue
    const conversation = conversations.get(f.pairKey)
    const item = toRequestItem(user, f, conversation && conversation._id, isUnlocked(conversation, f))
    if (String(f.recipient) === String(me._id)) incoming.push(item)
    else outgoing.push(item)
  }

  res.json({ incoming, outgoing })
}

// Creates a pending request, or revives a `removed` friendship as a new pending one.
const createOrReviveRequest = async (me, target, pairKey) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const existing = await Friendship.findOne({ pairKey })

    if (!existing) {
      try {
        return await Friendship.create({ requester: me._id, recipient: target._id, pairKey, status: 'pending' })
      } catch (err) {
        if (err.code === 11000) continue // someone else created it first: classify it on the next pass
        throw err
      }
    }

    if (existing.status === 'accepted') throw errors.alreadyFriends()
    if (existing.status === 'pending') throw errors.requestPending()

    const revived = await Friendship.findOneAndUpdate(
      { _id: existing._id, status: 'removed' },
      {
        $set: {
          requester: me._id,
          recipient: target._id,
          status: 'pending',
          requestedAt: new Date(),
          acceptedAt: null,
          removedAt: null,
          removedBy: null
        }
      },
      { returnDocument: 'after' }
    )
    if (revived) return revived
  }
  throw errors.requestPending()
}

// POST /api/friends/requests  { playerId }  -> 201 { request }
const createRequest = async (req, res) => {
  const me = req.me
  const playerId = parseLookupPlayerId(req.body && req.body.playerId)

  if (playerId === me.playerId) throw errors.cannotAddSelf()
  const target = await User.findOne({ playerId })
  if (!target) throw errors.playerNotFound()

  const pairKey = makePairKey(me._id, target._id)
  const friendship = await createOrReviveRequest(me, target, pairKey)

  // The conversation exists from the moment of the request (and is reused if there was one before).
  const conversation = await ensureConversation(me._id, target._id)
  await updateStates(conversation._id, [me._id, target._id], { closed: false })

  // The lock only applies the FIRST time: if this pair was ever unlocked (earlier reply or friendship),
  // the requester is born unlocked and can read/send right away.
  const unlocked = isUnlocked(conversation, friendship)

  joinConversation(target._id, conversation._id) // recipient can open and answer right away
  if (unlocked) joinConversation(me._id, conversation._id)
  else leaveConversation(me._id, conversation._id) // requester stays locked out until the recipient replies

  emitToUser(target._id, 'friend:request', toRequestItem(me, friendship, conversation._id, unlocked))
  res.status(201).json({ request: toRequestItem(target, friendship, conversation._id, unlocked) })
}

// POST /api/friends/requests/:id/accept  -> { friend }
const acceptRequest = async (req, res) => {
  const me = req.me
  if (!isObjectId(req.params.id)) throw errors.requestNotFound()

  const friendship = await Friendship.findOneAndUpdate(
    { _id: req.params.id, recipient: me._id, status: 'pending' },
    { $set: { status: 'accepted', acceptedAt: new Date() } },
    { returnDocument: 'after' }
  )
  if (!friendship) throw errors.requestNotFound()

  const requester = await User.findById(friendship.requester)
  if (!requester) throw errors.requestNotFound()

  const conversation = await ensureConversation(friendship.requester, friendship.recipient)
  // Accepting also opens the DM for good (only the first time; the marker is never overwritten or cleared).
  // No dm:unlocked here: friend:accepted already tells both sides.
  await Conversation.updateOne({ _id: conversation._id, firstUnlockedAt: null }, { $set: { firstUnlockedAt: new Date() } })
  for (const participantId of conversation.participants) {
    const state = conversation.states.get(String(participantId))
    if (!(state && state.closed)) joinConversation(participantId, conversation._id)
  }

  const forMe = toContact(requester, { conversationId: conversation._id, friendsSince: friendship.acceptedAt })
  const forRequester = toContact(me, { conversationId: conversation._id, friendsSince: friendship.acceptedAt })
  emitToUser(me._id, 'friend:accepted', forMe)
  emitToUser(requester._id, 'friend:accepted', forRequester)

  res.json({ friend: forMe })
}

// POST /api/friends/requests/:id/decline  -> { ok: true }
// The request is deleted and the DM is closed for BOTH people (history cutoff = now).
const declineRequest = async (req, res) => {
  const me = req.me
  if (!isObjectId(req.params.id)) throw errors.requestNotFound()

  const friendship = await Friendship.findOneAndDelete({ _id: req.params.id, recipient: me._id, status: 'pending' })
  if (!friendship) throw errors.requestNotFound()

  const conversation = await Conversation.findOne({ pairKey: friendship.pairKey })
  if (conversation) {
    await updateStates(conversation._id, conversation.participants, { closed: true, closedAt: new Date() })
    leaveConversation(friendship.requester, conversation._id)
    leaveConversation(friendship.recipient, conversation._id)
  }

  // Extra (not in the briefing): lets the requester's outgoing node disappear live.
  emitToUser(friendship.requester, 'friend:declined', { id: String(friendship._id), playerId: me.playerId })
  res.json({ ok: true })
}

const cancelRequest = async (req, res) => {
  const me = req.me
  if (!isObjectId(req.params.id)) throw errors.requestNotFound()

  // Not found / not yours / already accepted or removed all end in the same 404 (no existence leak).
  const friendship = await Friendship.findOneAndDelete({ _id: req.params.id, requester: me._id, status: 'pending' })
  if (!friendship) throw errors.requestNotFound()

  const conversation = await Conversation.findOne({ pairKey: friendship.pairKey })
  if (conversation) {
    await updateStates(conversation._id, conversation.participants, { closed: true, closedAt: new Date() })
    leaveConversation(friendship.requester, conversation._id)
    leaveConversation(friendship.recipient, conversation._id)
  }

  emitToUser(friendship.recipient, 'friend:cancelled', { id: String(friendship._id) })
  res.json({ ok: true })
}

// DELETE /api/friends/:playerId  -> { ok, playerId, conversationId, status: 'disconnected' }
// The friendship is kept as `removed`; the conversation stays (read-only for both).
const removeFriend = async (req, res) => {
  const me = req.me
  const playerId = parseLookupPlayerId(normalizePlayerId(req.params.playerId))

  const target = await User.findOne({ playerId })
  if (!target) throw errors.playerNotFound()

  const pairKey = makePairKey(me._id, target._id)
  const friendship = await Friendship.findOneAndUpdate(
    { pairKey, status: 'accepted' },
    { $set: { status: 'removed', removedAt: new Date(), removedBy: me._id } },
    { returnDocument: 'after' }
  )
  if (!friendship) throw errors.playerNotFound('That player is not in your friend list')

  const conversation = await ensureConversation(me._id, target._id)
  emitToUser(target._id, 'friend:removed', {
    playerId: me.playerId,
    conversationId: String(conversation._id)
  })

  res.json({
    ok: true,
    playerId: target.playerId,
    conversationId: String(conversation._id),
    status: 'disconnected'
  })
}

module.exports = { getFriends, getRequests, createRequest, acceptRequest, declineRequest, cancelRequest, removeFriend }
