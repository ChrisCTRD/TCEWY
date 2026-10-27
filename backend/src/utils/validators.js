const { errors } = require('./AppError')

const PLAYER_ID_REGEX = /^[a-z0-9_]{3,20}$/
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/

const BALLOONS = ['round', 'square', 'shouting', 'thought', 'scribble', 'small']
// `scribble` is reserved for deleted messages; clients cannot send it.
const SENDABLE_BALLOONS = BALLOONS.filter((b) => b !== 'scribble')

const MESSAGE_MAX = 1000
const BIO_MAX = 200
const RAW_TEXT_MAX = 5000 // hard cap before sanitizing (keeps the regex work bounded)

const normalizePlayerId = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '')

// Used when we only *look up* a player: lenient so legacy accounts stay reachable.
const parseLookupPlayerId = (value) => {
  const playerId = normalizePlayerId(value)
  if (!playerId || playerId.length > 50) throw errors.validation('playerId is required')
  return playerId
}

const isObjectId = (value) => typeof value === 'string' && OBJECT_ID_REGEX.test(value)

// Removes control chars and HTML tags (looped so "<scr<script>ipt>" cannot rebuild a tag), then trims.
// Things like "<3" or "a < b" are kept: they are not tags.
const cleanText = (raw) => {
  let text = String(raw).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  let previous
  do {
    previous = text
    text = text.replace(/<\/?[a-zA-Z!][^>]*>/g, '')
  } while (text !== previous)
  return text.trim()
}

const sanitizeMessageText = (raw) => {
  if (typeof raw !== 'string') throw errors.validation('text must be a string')
  if (raw.length > RAW_TEXT_MAX) throw errors.validation(`text must be at most ${MESSAGE_MAX} characters`)
  const text = cleanText(raw)
  if (!text) throw errors.validation('text cannot be empty')
  if (text.length > MESSAGE_MAX) throw errors.validation(`text must be at most ${MESSAGE_MAX} characters`)
  return text
}

const parseBalloon = (value) => {
  if (value === undefined || value === null) return 'round'
  if (typeof value !== 'string' || !SENDABLE_BALLOONS.includes(value)) {
    throw errors.validation(`balloon must be one of: ${SENDABLE_BALLOONS.join(', ')}`)
  }
  return value
}

const parseClientId = (value) => {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || !value.trim() || value.length > 100) {
    throw errors.validation('clientId must be a non-empty string (max 100 chars)')
  }
  return value
}

module.exports = {
  PLAYER_ID_REGEX,
  BALLOONS,
  BIO_MAX,
  normalizePlayerId,
  parseLookupPlayerId,
  isObjectId,
  cleanText,
  sanitizeMessageText,
  parseBalloon,
  parseClientId
}
