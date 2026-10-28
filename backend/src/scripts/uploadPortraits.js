// Sobe os portraits de portraits-source/ para o Supabase Storage e registra os metadados no Mongo.
// Rode da raiz do backend:  node src/scripts/uploadPortraits.js
//
// Nome dos arquivos: personagem_expressao.png | .webp   (ex.: neku_default.webp, shiki_smile.png)
//   - personagem: neku, shiki, joshua ou beat
//   - expressao: só letras minúsculas e números, SEM underscore (neku_smile2 ok, neku_smile_2 não)
//   - default, fight, annoyed, redeyes e thoughtful são os estados do sistema (índice 0-4)
//   - qualquer outro nome é um extra e recebe o próximo índice livre, de 5 a 35
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Portrait = require("../models/Portrait");
const { STATES, makeAssetId } = require("../utils/portraitId");
const { uploadFile } = require("../services/storage");

const PREFIX = { neku: "ske", shiki: "mah", joshua: "yyj", beat: "sjb" };
const MIME = { ".png": "image/png", ".webp": "image/webp" };
const EXPR = /^[a-z0-9]{1,20}$/;
const FIRST_EXTRA_INDEX = 5;
const MAX_INDEX = 35;
const DIR = path.join(__dirname, "../../portraits-source");

// estados do sistema têm índice fixo; extras pegam o próximo livre a partir do 5
async function pickIndex(character, expression) {
  if (Object.hasOwn(STATES, expression)) return STATES[expression];
  const used = new Set((await Portrait.find({ character }).select("index")).map((p) => p.index));
  let index = FIRST_EXTRA_INDEX;
  while (used.has(index)) index++;
  return index <= MAX_INDEX ? index : null;
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("Defina MONGO_URI no .env (ou ajuste o nome da variável neste script).");
  await mongoose.connect(uri);

  for (const file of fs.readdirSync(DIR)) {
    const { name, ext } = path.parse(file);
    const contentType = MIME[ext.toLowerCase()];
    const parts = name.split("_");
    const [character, expression] = parts;

    if (!contentType || parts.length !== 2 || !PREFIX[character] || !EXPR.test(expression)) {
      console.log("pulando (nome ou formato inválido):", file);
      continue;
    }
    if (await Portrait.exists({ character, expression })) {
      console.log("já existe:", file);
      continue;
    }

    const index = await pickIndex(character, expression);
    if (index === null) {
      console.log(`pulando (limite de ${MAX_INDEX + 1} portraits por personagem):`, file);
      continue;
    }

    const assetId = makeAssetId(PREFIX[character], index);
    const storageKey = `p/${assetId}`;

    await uploadFile(storageKey, fs.readFileSync(path.join(DIR, file)), contentType);
    await Portrait.create({
      character,
      prefix: PREFIX[character],
      expression,
      index,
      assetId,
      storageKey,
      contentType,
    });
    console.log("ok:", file, "->", assetId);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
