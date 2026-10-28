const router = require('express').Router();
const Portrait = require('../models/Portrait');
const { downloadFile } = require('../services/storage');
const auth = require('../middleware/auth'); // o seu middleware JWT

const CHARS = ['neku', 'shiki', 'joshua', 'beat'];
const EXPR = /^[a-z0-9]{1,20}$/;

// GET /api/portraits?char=neku&e=default
// O front pede a expressão pelo NOME; o ID ofuscado nunca sai do servidor.
router.get('/', auth, async (req, res) => {
  const { char } = req.query;
  const e = req.query.e ?? 'default';
  if (!CHARS.includes(char) || typeof e !== 'string' || !EXPR.test(e)) return res.sendStatus(400);

  // se a expressão pedida ainda não existe, cai no default em vez de dar erro
  let doc = await Portrait.findOne({ character: char, expression: e });
  if (!doc) doc = await Portrait.findOne({ character: char, expression: 'default' });
  if (!doc) return res.sendStatus(404);

  const buffer = await downloadFile(doc.storageKey);
  res.set({ 'Content-Type': doc.contentType, 'Cache-Control': 'private, max-age=86400' });
  res.send(buffer);
});

module.exports = router;
