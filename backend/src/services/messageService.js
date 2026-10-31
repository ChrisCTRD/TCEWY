const Conversation = require('../models/Conversation')
const Message = require('../models/Message')
const User = require('../models/User')
const { getAccess, requireReadable, updateStates } = require('./conversations')
const { errors } = require('../utils/AppError')
const {
  isObjectId,
  sanitizeMessageText,
  parseBalloon,
  parseClientId
} = require('../utils/validators')
const { toMessage } = require('../utils/serializers')
const {
  emitToUser,
  emitToConversation,
  joinConversation
} = require('../socket/realtime')

const EXPRESSION_REGEX = /^[a-z0-9]{1,20}$/
const parseExpression = (value) =>
  typeof value === 'string' && EXPRESSION_REGEX.test(value) ? value : 'default'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100


// `userId` is a string, `playerId` the sender's public id.
const sendMessage = async ({ userId, playerId, conversationId, text, balloon, expression, clientId }) => {

  const balloonValue = parseBalloon(balloon)
  const expressionValue = parseExpression(expression)


  const access = requireReadable(await getAccess(userId, conversationId))
  const { conversation } = access

  // Resend of something already stored: answer with the stored message, do not broadcast again.
  if (clientIdValue) {
    const existing = await Message.findOne({ conversationId: conversation._id, senderId: userId, clientId: clientIdValue })
    if (existing) return toMessage(existing, playerId)
  }

  if (!access.canSend) throw errors.connectionLost()

  let message
  try {
    message = await Message.create({
      conversationId: conversation._id,
      senderId: userId,
      text: cleanText,
      balloon: balloonValue,
      expression: expressionValue,
      ...(clientIdValue ? { clientId: clientIdValue } : {})
  })
  } catch (err) {
    if (err.code === 11000 && clientIdValue) {
      const existing = await Message.findOne({ conversationId: conversation._id, senderId: userId, clientId: clientIdValue })
      if (existing) return toMessage(existing, playerId)
    }
    throw err
  }

  await Conversation.updateOne({ _id: conversation._id }, { $max: { lastMessageAt: message.createdAt } })

  // First message from the RECIPIENT of a pending request opens the DM for the requester, for good:
  // Conversation.firstUnlockedAt is set once (null -> date) and never cleared. dm:unlocked fires only on that
  // transition. The request itself stays pending: sending a message never accepts it.
  if (access.status === 'pending_in' && !access.unlocked) {
    const flipped = await Conversation.findOneAndUpdate(
      { _id: conversation._id, firstUnlockedAt: null },
      { $set: { firstUnlockedAt: new Date() } }
    )
    if (flipped) {
      const requesterId = String(access.friendship.requester)
      if (!access.other.closed) joinConversation(requesterId, conversation._id)
      emitToUser(requesterId, 'dm:unlocked', {
        conversationId: String(conversation._id),
        fromPlayerId: playerId
      })
    }
  }

  const payload = toMessage(message, playerId)
  emitToConversation(conversation._id, 'message:new', payload)
  return payload
}

const deleteMessage = async ({ userId, playerId, messageId }) => {
  const notFound = () => errors.conversationNotFound('Message not found')
  if (!isObjectId(messageId)) throw notFound()

  let message = await Message.findById(messageId)
  if (!message) throw notFound()

  // Not a participant / hidden / locked all end in the same 404.
  const access = requireReadable(await getAccess(userId, String(message.conversationId)))
  const cutoff = access.me.closedAt
  if (cutoff && message.createdAt <= cutoff) throw notFound()

  if (String(message.senderId) !== String(userId)) {
    throw errors.forbidden('Only the author can delete a message')
  }

  if (!message.deletedAt) {
    const updated = await Message.findOneAndUpdate(
      { _id: message._id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { returnDocument: 'after' }
    )
    if (updated) {
      message = updated
      emitToConversation(message.conversationId, 'message:deleted', {
        id: String(message._id),
        conversationId: String(message.conversationId)
      })
    }
  }

  return toMessage(message, playerId)
}

const markRead = async ({ userId, conversationId }) => {
  const access = requireReadable(await getAccess(userId, conversationId))
  await updateStates(access.conversation._id, [userId], { lastReadAt: new Date() })
}

// Newest first. `before` is a message id (cursor); anything at/before the viewer's closedAt is never returned.
const getHistory = async ({ userId, playerId, conversationId, before, limit }) => {
  const access = requireReadable(await getAccess(userId, conversationId))
  const { conversation, me, other } = access

  let take = Number.parseInt(limit, 10)
  if (!Number.isFinite(take) || take < 1) take = DEFAULT_LIMIT
  take = Math.min(take, MAX_LIMIT)

  const and = [{ conversationId: conversation._id }]
  if (me.closedAt) and.push({ createdAt: { $gt: me.closedAt } })

  const hasCursor = before !== undefined && before !== ''
  if (hasCursor) {
    if (!isObjectId(before)) throw errors.validation('Invalid "before" cursor')
    const cursor = await Message.findOne({ _id: before, conversationId: conversation._id })
    if (!cursor) throw errors.validation('Invalid "before" cursor')
    and.push({
      $or: [
        { createdAt: { $lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, _id: { $lt: cursor._id } }
      ]
    })
  }

  const docs = await Message.find({ $and: and }).sort({ createdAt: -1, _id: -1 }).limit(take + 1)
  const hasMore = docs.length > take
  const page = docs.slice(0, take)

  const otherUser = await User.findById(other.id).select('playerId')
  const playerIds = new Map([
    [String(userId), playerId],
    [String(other.id), otherUser ? otherUser.playerId : '']
  ])

  // Opening the conversation (first page) counts as reading it.
  if (!hasCursor) await updateStates(conversation._id, [userId], { lastReadAt: new Date() })

  const messages = page.map((m) => toMessage(m, playerIds.get(String(m.senderId)) || ''))
  return {
    messages,
    hasMore,
    nextBefore: hasMore ? messages[messages.length - 1].id : null
  }
}

module.exports = { sendMessage, deleteMessage, markRead, getHistory }
