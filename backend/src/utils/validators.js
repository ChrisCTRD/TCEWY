const { errors } = require('./AppError')
const { STATES } = require('./portraitId')


const PLAYER_ID_REGEX = /^[a-z0-9_]{3,20}$/
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/

const BALLOONS = ['round', 'square', 'shouting', 'thought', 'scribble', 'small']

const MESSAGE_MAX = 1000
const BIO_MAX = 200
const RAW_TEXT_MAX = 5000 // hard cap before sanitizing (keeps the regex work bounded)
// Characters that exist as portrait/icon assets. Joshua is mapped but not mounted in the front yet.
// To add a new character, just add it here.
const CHARACTERS = ['neku', 'shiki', 'joshua']
const EXPRESSIONS = Object.keys(STATES)
const ICONS = ['icon_default', ...CHARACTERS.map((c) => `${c}_icon`)]

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

// A scribble carries no text: whatever the client sent is dropped. Every other balloon requires text.
const sanitizeMessageText = (raw, balloon = 'round') => {
  if (balloon === 'scribble') return ''
  if (typeof raw !== 'string') throw errors.validation('text must be a string')
  if (raw.length > RAW_TEXT_MAX) throw errors.validation(`text must be at most ${MESSAGE_MAX} characters`)
  const text = cleanText(raw)
  if (!text) throw errors.validation('text cannot be empty')
  if (text.length > MESSAGE_MAX) throw errors.validation(`text must be at most ${MESSAGE_MAX} characters`)
  return text
}

const parseBalloon = (value) => {
  if (value === undefined || value === null) return 'round'
  if (typeof value !== 'string' || !BALLOONS.includes(value)) {
    throw errors.validation(`balloon must be one of: ${BALLOONS.join(', ')}`)
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

// "<char>_<expression>", e.g. "neku_default".
const parsePortrait = (value) => {
  const match = typeof value === 'string' ? /^([a-z0-9]+)_([a-z0-9]+)$/.exec(value) : null
  if (!match || !CHARACTERS.includes(match[1]) || !EXPRESSIONS.includes(match[2])) {
    throw errors.invalidPortrait()
  }
  return value
}

// Icon name without extension ("neku_icon") or "icon_default".
const parseIcon = (value) => {
  if (typeof value !== 'string' || !ICONS.includes(value)) throw errors.invalidIcon()
  return value
}

module.exports = {
  PLAYER_ID_REGEX,
  BALLOONS,
  BIO_MAX,
  CHARACTERS,
  ICONS,
  normalizePlayerId,
  parseLookupPlayerId,
  isObjectId,
  cleanText,
  sanitizeMessageText,
  parseBalloon,
  parseClientId,
  parsePortrait,
  parseIcon
}
