const jwt = require('jsonwebtoken')

const authMiddleware = (req, res, next) => {
  const { authorization } = req.headers

  if (!authorization) {
    return res.status(401).json({ message: 'Token not provided' })
  }

  const token = authorization.replace('Bearer ', '')

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

module.exports = authMiddleware