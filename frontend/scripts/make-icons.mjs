// Gera as versões leves dos ícones dos personagens a partir dos originais (2048x2048).
//   public/icons/<nome>_icon.webp  ->  public/icons/sm/<nome>_icon.webp  (nós do grafo e slots do THREADS)
//                                      public/icons/lg/<nome>_icon.webp  (painel de detalhe do THREADS)
// Uso: npm i -D sharp   e   node scripts/make-icons.mjs   (ou `npm run icons`, ver package.json)
// Os originais não são alterados. Rode de novo sempre que adicionar ou refazer um ícone.
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ICONS = fileURLToPath(new URL("../public/icons", import.meta.url));
const SIZES = { sm: 384, lg: 1024 };

const files = (await readdir(ICONS)).filter((f) => /_icon\.webp$/i.test(f));
if (!files.length) {
  console.error(`Nenhum *_icon.webp encontrado em ${ICONS}`);
  process.exit(1);
}

for (const dir of Object.keys(SIZES)) await mkdir(path.join(ICONS, dir), { recursive: true });

for (const file of files) {
  for (const [dir, size] of Object.entries(SIZES)) {
    await sharp(path.join(ICONS, file))
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88, alphaQuality: 100 }) // mantém o fundo transparente intacto
      .toFile(path.join(ICONS, dir, file));
  }
  console.log("ok", file);
}
