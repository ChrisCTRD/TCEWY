// Sobe os portraits de portraits-source/ para o Supabase Storage e registra os metadados no Mongo.
// Rode da raiz do backend:  node src/scripts/uploadPortraits.js
//
// Nome dos arquivos: personagem_expressao.png | .webp   (ex.: neku_default.webp, shiki_fight.png)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Portrait = require("../models/Portrait");
const { STATES, makeAssetId } = require("../utils/portraitId");
const { uploadFile } = require("../services/storage");

const PREFIX = { neku: "ske", shiki: "mah", joshua: "yyj", beat: "sjb" };
const MIME = { ".png": "image/png", ".webp": "image/webp" };
const DIR = path.join(__dirname, "../../portraits-source");

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("Defina MONGO_URI no .env (ou ajuste o nome da variável neste script).");
  await mongoose.connect(uri);

  for (const file of fs.readdirSync(DIR)) {
    const { name, ext } = path.parse(file);
    const contentType = MIME[ext.toLowerCase()];
    const [character, expression] = name.split("_");

    if (!contentType || !PREFIX[character] || !Object.hasOwn(STATES, expression)) {
      console.log("pulando (nome ou formato inválido):", file);
      continue;
    }
    if (await Portrait.exists({ character, expression })) {
      console.log("já existe:", file);
      continue;
    }

    const assetId = makeAssetId(PREFIX[character], STATES[expression]);
    const storageKey = `p/${assetId}`;

    await uploadFile(storageKey, fs.readFileSync(path.join(DIR, file)), contentType);
    await Portrait.create({
      character,
      prefix: PREFIX[character],
      expression,
      index: STATES[expression],
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