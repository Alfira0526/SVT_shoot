// 컷씬 5장 + 카드 뒷면을 한 장으로 (검토용). `node scripts/cutscene-sheet.mjs <outDir>`
import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || root;
const dir = join(root, 'public', 'assets', 'cutscenes');
const files = ['c1_concert', 'c2_booth', 'c3_reveal', 'c4_accident', 'c5_wand', 'card_back'];
const comps = [];
for (let i = 0; i < files.length; i++) {
  const buf = await sharp(join(dir, `${files[i]}.png`)).resize(240, 400, { fit: 'contain', background: '#000' }).png().toBuffer();
  comps.push({ input: buf, left: i * 250 + 5, top: 5 });
}
await sharp({ create: { width: files.length * 250, height: 410, channels: 4, background: '#111' } }).composite(comps).png().toFile(join(out, 'cutscene_sheet.png'));
console.log('ok');
