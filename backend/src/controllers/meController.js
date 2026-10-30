const User = require('../models/User')
const { errors } = require('../utils/AppError')
const { BIO_MAX, cleanText } = require('../utils/validators')
const { toPublicUser, iso } = require('../utils/serializers')
const { parsePortrait, parseIcon } = require('../utils/validators')
const { emitToUser } = require('../socket/realtime')
const { listCounterpartIds } = require('../services/conversations')

const toMe = (user) => ({ ...toPublicUser(user), createdAt: iso(user.createdAt) })

// GET /api/me
const getMe = (req, res) => {
  res.json({ user: toMe(req.me) })
}

// Tells everyone who sees this user (and the user's other sessions) about the new look.
const broadcastProfileUpdated = async (user) => {
  const payload = { playerId: user.playerId, portrait: user.portrait, icon: user.icon }
  const targets = await listCounterpartIds(user._id)
  targets.forEach((id) => emitToUser(id, 'profile:updated', payload))
  emitToUser(user._id, 'profile:updated', payload)
}

// PATCH /api/me  { portrait?, icon? }
const updateProfile = async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const $set = {}
  if ('portrait' in body) $set.portrait = parsePortrait(body.portrait)
  if ('icon' in body) $set.icon = parseIcon(body.icon)
  if (!Object.keys($set).length) throw errors.validation('portrait or icon is required')

  const user = await User.findByIdAndUpdate(
    req.me._id,
    { $set },
    { returnDocument: 'after', runValidators: true }
  )

  // The save already succeeded: a realtime failure must not turn it into a 500.
  try {
    await broadcastProfileUpdated(user)
  } catch (err) {
    console.error('profile:updated broadcast failed:', err)
  }

  res.json({ user: toMe(user) })
}

module.exports = { getMe, updateProfile }
