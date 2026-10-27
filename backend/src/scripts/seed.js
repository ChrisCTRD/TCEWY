// Test data for TCEWY. Run with:  npm run seed
// Safe to run again: it only wipes/recreates the `test_*` accounts below (and their friendships,
// conversations and messages). Real accounts are never touched.
require('dotenv').config()
const mongoose = require('mongoose')
const User = require('../models/User')
const Friendship = require('../models/Friendship')
const Conversation = require('../models/Conversation')
const Message = require('../models/Message')
const { makePairKey } = require('../utils/pairKey')

const PASSWORD = 'tcewy1234'
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const TEST_USERS = [
  { playerId: 'test_chris', displayName: 'Chris (test)', bio: 'Main test account.', role: 'Player', portrait: 'neku_default' },
  { playerId: 'test_shiki', displayName: 'ShikiFan26 (test)', bio: "Hello! I'm the type of person that plays a lot of video games.", role: 'Player', portrait: 'shiki_default' },
  { playerId: 'test_neku', displayName: 'Neku (test)', bio: 'Whatever.', role: 'Player' },
  { playerId: 'test_joshua', displayName: 'Joshua (test)', bio: 'Composer on duty.', role: 'Composer' },
  { playerId: 'test_beat', displayName: 'Beat (test)', bio: 'Skate or die.', role: 'Reaper' },
  // Stranger: no relationship with anyone. Use it to test the first-time DM lock (it never answered anyone).
  { playerId: 'test_zed', displayName: 'Zed (test)', bio: 'Just passing by.', role: 'Player', portrait: 'neku_default' }
]

const wipe = async () => {
  const users = await User.find({ playerId: { $in: TEST_USERS.map((u) => u.playerId) } }).select('_id')
  const ids = users.map((u) => u._id)
  if (!ids.length) return
  const conversations = await Conversation.find({ participants: { $in: ids } }).select('_id')
  await Message.deleteMany({ conversationId: { $in: conversations.map((c) => c._id) } })
  await Conversation.deleteMany({ _id: { $in: conversations.map((c) => c._id) } })
  await Friendship.deleteMany({ $or: [{ requester: { $in: ids } }, { recipient: { $in: ids } }] })
  await User.deleteMany({ _id: { $in: ids } })
}

// Friendship + conversation (+ optional messages) for a pair.
//   messages: [{ from: user, text, balloon?, minutesAgo, deleted? }]
const link = async (requester, recipient, { status, firstUnlockedAt = null, requestedAt, acceptedAt = null, removedAt = null, removedBy = null, messages = [] }) => {
  const pairKey = makePairKey(requester._id, recipient._id)
  await Friendship.create({
    requester: requester._id,
    recipient: recipient._id,
    pairKey,
    status,
    requestedAt,
    acceptedAt,
    removedAt,
    removedBy
  })

  const conversation = await Conversation.create({
    pairKey,
    firstUnlockedAt,
    participants: [requester._id, recipient._id],
    states: {
      [String(requester._id)]: { closed: false },
      [String(recipient._id)]: { closed: false }
    }
  })

  let lastMessageAt = null
  for (const m of messages) {
    const createdAt = new Date(Date.now() - m.minutesAgo * 60 * 1000)
    await Message.create({
      conversationId: conversation._id,
      senderId: m.from._id,
      text: m.text,
      balloon: m.balloon || 'round',
      deletedAt: m.deleted ? createdAt : null,
      createdAt
    })
    if (!lastMessageAt || createdAt > lastMessageAt) lastMessageAt = createdAt
  }
  if (lastMessageAt) await Conversation.updateOne({ _id: conversation._id }, { $set: { lastMessageAt } })
  return conversation
}

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI)
  await wipe()

  const created = {}
  for (const data of TEST_USERS) {
    created[data.playerId] = await User.create({ ...data, email: `${data.playerId}@tcewy.test`, password: PASSWORD })
  }
  const chris = created.test_chris
  const shiki = created.test_shiki
  const neku = created.test_neku
  const joshua = created.test_joshua
  const beat = created.test_beat
  const now = Date.now()

  // 1) friend: chris <-> shiki, with a conversation (one deleted message shows as scribble)
  await link(chris, shiki, {
    status: 'accepted',
    firstUnlockedAt: new Date(now - 3 * DAY + HOUR),
    requestedAt: new Date(now - 3 * DAY),
    acceptedAt: new Date(now - 3 * DAY + HOUR),
    messages: [
      { from: shiki, text: 'Hey, you there?', minutesAgo: 190 },
      { from: chris, text: "Haven't you seen last event?", minutesAgo: 185 },
      { from: shiki, text: 'WHAT. Tell me everything.', balloon: 'shouting', minutesAgo: 184 },
      { from: chris, text: 'It was kind of unbelievable...', balloon: 'thought', minutesAgo: 180 },
      { from: shiki, text: 'oops wrong chat', minutesAgo: 170, deleted: true },
      { from: shiki, text: 'ok brb', balloon: 'small', minutesAgo: 60 },
      { from: shiki, text: 'ugh, never mind', minutesAgo: 30, deleted: true },
    ]
  })

  // 2) pending_in for chris: neku asked chris (conversation exists, neku is still locked out)
  await link(neku, chris, { status: 'pending', requestedAt: new Date(now - 2 * HOUR) })

  // 3) pending_out for chris: chris asked joshua (locked until joshua sends the first message)
  await link(chris, joshua, { status: 'pending', requestedAt: new Date(now - HOUR) })

  // 4) disconnected: chris <-> beat were friends, beat removed the friendship (history stays readable)
  await link(chris, beat, {
    status: 'removed',
    firstUnlockedAt: new Date(now - 10 * DAY + HOUR),
    requestedAt: new Date(now - 10 * DAY),
    acceptedAt: new Date(now - 10 * DAY + HOUR),
    removedAt: new Date(now - 2 * DAY),
    removedBy: beat._id,
    messages: [
      { from: beat, text: 'See you at the scramble.', minutesAgo: 60 * 24 * 5 },
      { from: chris, text: 'Bring the skateboard.', minutesAgo: 60 * 24 * 5 - 3 },
      { from: beat, text: 'Always.', balloon: 'small', minutesAgo: 60 * 24 * 5 - 5 }
    ]
  })

  console.log('Seed done. Password for every test account:', PASSWORD)
  console.log('Login (playerId): test_chris, test_shiki, test_neku, test_joshua, test_beat, test_zed (stranger, no relations)')
  console.log('From test_chris you see: test_shiki = friend, test_neku = pending_in,')
  console.log('                         test_joshua = pending_out (locked), test_beat = disconnected')
  console.log('To test the unlock: log in as test_joshua and send a message in his DM with test_chris.')

  await mongoose.disconnect()
}

run().catch(async (err) => {
  console.error('Seed failed:', err)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
