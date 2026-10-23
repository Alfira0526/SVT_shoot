// 현재 에셋 규격 보고 + 컨택트 시트(검토용). `node scripts/asset-report.mjs [outDir]`
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || root;
const dirs = ['sprites', 'portraits', 'cutscenes'];
const rows = [];
for (const d of dirs) {
  const dir = join(root, 'public', 'assets', d);
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.png')).sort()) {
    const m = await sharp(join(dir, f)).metadata();
    rows.push({ dir: d, file: f, w: m.width, h: m.height });
  }
}
for (const r of rows) console.log(`${r.dir}/${r.file}\t${r.w}x${r.h}`);

// 컨택트 시트: 스프라이트·초상화를 격자로 (크기 유지, 셀 130)
const cell = 130;
const list = rows.filter((r) => r.dir !== 'cutscenes');
const cols = 8;
const rowsN = Math.ceil(list.length / cols);
const comps = [];
for (let i = 0; i < list.length; i++) {
  const r = list[i];
  const buf = await sharp(join(root, 'public', 'assets', r.dir, r.file))
    .resize(Math.min(120, r.w * (r.w < 40 ? 3 : 1)), null, { kernel: 'nearest', fit: 'inside' })
    .png()
    .toBuffer();
  comps.push({ input: buf, left: (i % cols) * cell + 5, top: Math.floor(i / cols) * cell + 5 });
}
await sharp({ create: { width: cols * cell, height: rowsN * cell, channels: 4, background: '#2c2758' } })
  .composite(comps)
  .png()
  .toFile(join(out, 'asset_sheet.png'));
console.log('sheet →', join(out, 'asset_sheet.png'));
