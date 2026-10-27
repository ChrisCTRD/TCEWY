const crypto = require('crypto');

const STATES = { default: 0, fight: 1, annoyed: 2, redeyes: 3, thoughtful: 4 };
const CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';
const rand = () => CHARS[crypto.randomInt(36)];

function makeAssetId(prefix, index) {
  return `${prefix}_${rand()}${rand()}${CHARS[index]}${rand()}${rand()}${rand()}`;
}

module.exports = { STATES, makeAssetId };