const mongoose = require('mongoose')
const { BALLOONS } = require('../utils/validators')

const { ObjectId } = mongoose.Schema.Types

const messageSchema = new mongoose.Schema({
  conversationId: { type: ObjectId, ref: 'Conversation', required: true },
  senderId: { type: ObjectId, ref: 'User', required: true },
  text: {
    type: String,
    required: function () { return this.balloon !== 'scribble' },
    default: '',
    trim: true,
    maxlength: 1000
  },
  balloon: { type: String, enum: BALLOONS, default: 'round' },
  deletedAt: { type: Date, default: null },
  clientId: { type: String, maxlength: 100 } // omitted when the client does not send one
}, { timestamps: { createdAt: true, updatedAt: false } })

messageSchema.index({ conversationId: 1, createdAt: -1 })
// Dedupe resends: same sender + conversation + clientId can only exist once.
messageSchema.index(
  { conversationId: 1, senderId: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } }
)

module.exports = mongoose.model('Message', messageSchema)
