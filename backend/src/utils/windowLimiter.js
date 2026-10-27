// Sliding-window limiter. Returns a function: call it per event, `false` means "over the limit".
const createWindowLimiter = (limit, windowMs) => {
  const hits = []
  return () => {
    const now = Date.now()
    while (hits.length && now - hits[0] >= windowMs) hits.shift()
    if (hits.length >= limit) return false
    hits.push(now)
    return true
  }
}

module.exports = { createWindowLimiter }
