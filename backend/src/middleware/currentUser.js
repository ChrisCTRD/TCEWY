const User = require('../models/User')
const { errors } = require('../utils/AppError')

// Runs after authMiddleware: loads the logged-in user (without password) into req.me.
const currentUser = async (req, res, next) => {
  const me = await User.findById(req.user.id).select('-password')
  if (!me) throw errors.unauthorized('Account not found')
  req.me = me
  next()
}

module.exports = currentUser
