const router = require('express').Router();
const Portrait = require('../models/Portrait');
const { downloadFile } = require('../services/storage');
const auth = require('../middleware/auth'); // o seu middleware JWT

const CHARS = ['neku', 'shiki', 'joshua', 'beat'];
const EXPR = /^[a-z0-9]{1,20}$/;

// GET /api/portraits?char=neku&e=default
// O front pede a expressão pelo NOME; o ID ofuscado nunca sai do servidor.
router.get('/', auth, async (req, res) => {
  let doc = await Portrait.findOne({ character: char, expression: e });
  if (!doc) doc = await Portrait.findOne({ character: char, expression: 'default' });
  if (!doc) return res.sendStatus(404);

  // O navegador guarda a imagem, mas revalida antes de usar: o assetId muda quando o portrait é trocado.
  res.set({ ETag: `"${doc.assetId}"`, 'Cache-Control': 'private, no-cache' });
  if (req.fresh) return res.status(304).end(); // mesma versão: não baixa nada do Supabase

  let buffer
  try {
    buffer = await downloadFile(doc.storageKey)
  } catch (err) {
    console.error('portrait download failed:', doc.character, doc.expression, doc.storageKey, err.message)
    return res.sendStatus(502)
  }
  res.set('Content-Type', doc.contentType)
  res.send(buffer)
});

module.exports = router;
