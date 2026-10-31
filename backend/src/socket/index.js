const jwt = require('jsonwebtoken')
const { Server } = require('socket.io')
const User = require('../models/User')
const { setIO, userRoom, convRoom } = require('./realtime')
const { sendMessage, deleteMessage } = require('../services/messageService')
const { listVisibleEntries } = require('../services/conversations')
const { errors, toErrorPayload } = require('../utils/AppError')
const { createWindowLimiter } = require('../utils/windowLimiter')

const SEND_LIMIT = 10 // messages
const SEND_WINDOW_MS = 10_000 // per 10 s, per socket

// Handshake: io(url, { auth: { token } }) — same JWT the REST API takes as "Authorization: Bearer <token>".
const authenticate = async (socket, next) => {
  try {
    const raw = socket.handshake.auth && socket.handshake.auth.token
    if (typeof raw !== 'string' || !raw) throw new Error('missing token')
    const token = raw.replace(/^Bearer\s+/i, '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('playerId')
    if (!user) throw new Error('unknown user')
    socket.data.user = { id: String(user._id), playerId: user.playerId }
    next()
  } catch {
    const err = new Error('UNAUTHORIZED')
    err.data = { code: 'UNAUTHORIZED', message: 'Invalid or missing token' }
    next(err)
  }
}

// Wraps a handler so every event answers its ack callback with { ok: true, ... } or { ok: false, error }.
const withAck = (handler) => async (payload, ack) => {
  const reply = typeof ack === 'function' ? ack : () => {}
  try {
    const result = await handler(payload && typeof payload === 'object' ? payload : {})
    reply({ ok: true, ...result })
  } catch (err) {
    reply({ ok: false, error: toErrorPayload(err) })
  }
}

const onConnection = (socket) => {
  const { id: userId, playerId } = socket.data.user
  const allowSend = createWindowLimiter(SEND_LIMIT, SEND_WINDOW_MS)
  const allowDelete = createWindowLimiter(SEND_LIMIT, SEND_WINDOW_MS)

  // Handlers go in first so an event fired right after connect is never missed.
  socket.on('message:send', withAck(async ({ conversationId, text, balloon, expression, clientId }) => {
  if (!allowSend()) throw errors.rateLimited()
  const message = await sendMessage({ userId, playerId, conversationId, text, balloon, expression, clientId })
  return { message }
  }))

  socket.on('message:delete', withAck(async ({ messageId }) => {
    if (!allowDelete()) throw errors.rateLimited()
    await deleteMessage({ userId, playerId, messageId })
    return {}
  }))

  socket.join(userRoom(userId))
  listVisibleEntries(userId)
    .then((entries) => entries.forEach((entry) => socket.join(convRoom(entry.conversation._id))))
    .catch((err) => console.error('Socket room join failed:', err))
}

const initSocket = (httpServer, { origins }) => {
  const io = new Server(httpServer, { cors: { origin: origins, credentials: true } })
  setIO(io)
  io.use(authenticate)
  io.on('connection', onConnection)
  return io
}

module.exports = { initSocket }
