const mongoose = require('mongoose')

const { ObjectId } = mongoose.Schema.Types

// Per-participant state, stored in `states` keyed by the user id (states.<userId>.closed ...).
//   closed     -> the DM is hidden for this user (Close DM / decline)
//   closedAt   -> history cutoff: messages created at or before it are never returned to this user.
//                 It is never cleared, so reopening / re-friending starts from an empty history.
//   lastReadAt -> drives unreadCount
const participantStateSchema = new mongoose.Schema({
  closed: { type: Boolean, default: false },
  closedAt: { type: Date, default: null },
  lastReadAt: { type: Date, default: null }
}, { _id: false })

const conversationSchema = new mongoose.Schema({
  participants: {
    type: [{ type: ObjectId, ref: 'User' }],
    validate: {
      validator: (value) => Array.isArray(value) && value.length === 2,
      message: 'A conversation needs exactly 2 participants'
    }
  },
  states: { type: Map, of: participantStateSchema, default: () => ({}) },
  pairKey: { type: String, required: true, unique: true },
  lastMessageAt: { type: Date, default: null },
  // Permanent "the requester's DM lock is open" marker, per conversation (not per request).
  // Set once, by (a) the RECIPIENT of a request sending the 1st message, or (b) a friendship being accepted.
  // Never cleared: remove, new request, close and decline do not touch it.
  firstUnlockedAt: { type: Date, default: null }
}, { timestamps: true })

conversationSchema.index({ participants: 1 })

module.exports = mongoose.model('Conversation', conversationSchema)
