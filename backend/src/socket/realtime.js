// Thin wrapper around the socket.io server so REST controllers and services can emit
// without importing the server (and without crashing in scripts where there is no io).
let io = null

const setIO = (instance) => {
  io = instance
}

const userRoom = (userId) => `user:${userId}`
const convRoom = (conversationId) => `conv:${conversationId}`

const emitToUser = (userId, event, payload) => {
  if (io) io.to(userRoom(userId)).emit(event, payload)
}

const emitToConversation = (conversationId, event, payload) => {
  if (io) io.to(convRoom(conversationId)).emit(event, payload)
}

// Make every live socket of a user enter / leave a conversation room.
const joinConversation = (userId, conversationId) => {
  if (io) io.in(userRoom(userId)).socketsJoin(convRoom(conversationId))
}

const leaveConversation = (userId, conversationId) => {
  if (io) io.in(userRoom(userId)).socketsLeave(convRoom(conversationId))
}

module.exports = {
  setIO,
  userRoom,
  convRoom,
  emitToUser,
  emitToConversation,
  joinConversation,
  leaveConversation
}
