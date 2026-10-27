const User = require('../models/User')
const { errors } = require('../utils/AppError')
const { BIO_MAX, cleanText } = require('../utils/validators')
const { toPublicUser, iso } = require('../utils/serializers')

const toMe = (user) => ({ ...toPublicUser(user), createdAt: iso(user.createdAt) })

// GET /api/me
const getMe = (req, res) => {
  res.json({ user: toMe(req.me) })
}

// PATCH /api/me/bio  { bio }   (Mental Notes)
const updateBio = async (req, res) => {
  const bio = req.body && req.body.bio
  if (typeof bio !== 'string') throw errors.validation('bio must be a string')
  const clean = cleanText(bio)
  if (clean.length > BIO_MAX) throw errors.validation(`bio must be at most ${BIO_MAX} characters`)

  // findByIdAndUpdate (not save) so legacy accounts are not re-validated / re-hashed.
  const user = await User.findByIdAndUpdate(
    req.me._id,
    { $set: { bio: clean } },
    { returnDocument: 'after', runValidators: true }
  )
  res.json({ user: toMe(user) })
}

module.exports = { getMe, updateBio }
