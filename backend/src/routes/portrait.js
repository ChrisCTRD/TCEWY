const router = require('express').Router();
const Portrait = require('../models/Portrait');
const { STATES } = require('../utils/portraitId');
const { downloadFile } = require('../services/storage');
const auth = require('../middleware/auth'); // o seu middleware JWT

const CHARS = ['neku', 'shiki', 'joshua', 'beat'];
const CODES = Object.fromEntries(Object.entries(STATES).map(([k, v]) => [String(v), k]));

router.get('/', auth, async (req, res) => {
  const { char, s } = req.query;
  const state = CODES[s];
  if (!CHARS.includes(char) || !state) return res.sendStatus(400);

  let doc = await Portrait.findOne({ character: char, expression: state });
  if (!doc) doc = await Portrait.findOne({ character: char, expression: 'default' });
  if (!doc) return res.sendStatus(404);

  const buffer = await downloadFile(doc.storageKey);
  res.set({ 'Content-Type': doc.contentType, 'Cache-Control': 'private, max-age=86400' });
  res.send(buffer);
  obj.Body.pipe(res);
});

module.exports = router;