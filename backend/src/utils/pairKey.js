// Unordered pair of user ids -> same key no matter who is A or B.
const makePairKey = (a, b) => [String(a), String(b)].sort().join(':')

module.exports = { makePairKey }
