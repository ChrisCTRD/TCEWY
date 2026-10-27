const { errors } = require('../utils/AppError')

// Simple in-memory sliding window, keyed per user by default. Fine for a single server process.
const rateLimit = ({ limit, windowMs, key = (req) => (req.user && req.user.id) || req.ip }) => {
  const hits = new Map()

  // Drop idle keys so the map cannot grow forever.
  setInterval(() => {
    const now = Date.now()
    for (const [k, times] of hits) {
      while (times.length && now - times[0] >= windowMs) times.shift()
      if (!times.length) hits.delete(k)
    }
  }, windowMs).unref()

  return (req, res, next) => {
    const k = String(key(req))
    const now = Date.now()
    const times = hits.get(k) || []
    while (times.length && now - times[0] >= windowMs) times.shift()
    if (times.length >= limit) throw errors.rateLimited()
    times.push(now)
    hits.set(k, times)
    next()
  }
}

module.exports = rateLimit
