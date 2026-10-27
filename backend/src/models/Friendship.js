const mongoose = require('mongoose')

const { ObjectId } = mongoose.Schema.Types

// One document per unordered pair of users (pairKey is unique).
//   pending  -> request sent, waiting
//   accepted -> friends
//   removed  -> was friends, one side removed it (documents are kept; DM becomes read-only)
// A declined request is deleted.
const friendshipSchema = new mongoose.Schema({
  requester: { type: ObjectId, ref: 'User', required: true },
  recipient: {
    type: ObjectId,
    ref: 'User',
    required: true,
    validate: {
      validator: function (value) {
        return String(value) !== String(this.requester)
      },
      message: 'You cannot befriend yourself'
    }
  },
  pairKey: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'accepted', 'removed'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now }, // latest request (createdAt only records the very first one)
  acceptedAt: { type: Date, default: null },
  removedAt: { type: Date, default: null },
  removedBy: { type: ObjectId, ref: 'User', default: null }
}, { timestamps: true })

friendshipSchema.index({ requester: 1, status: 1 })
friendshipSchema.index({ recipient: 1, status: 1 })

module.exports = mongoose.model('Friendship', friendshipSchema)
