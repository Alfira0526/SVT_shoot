// public/assets 아래 파일 목록을 manifest.json으로 생성.
// Boot 씬이 이 목록만 보고 선택 에셋(도트·컷씬·초상화·아이콘)을 로드하므로 404 탐색 요청이 사라진다.
// package.json의 predev / prebuild에서 자동 실행.
import { readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = join(root, 'public', 'assets');
const out = join(assetsDir, 'manifest.json');

function walk(dir) {
  let files = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_') || name.startsWith('.')) continue; // _staging 등 제외
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files = files.concat(walk(full));
    else if (/\.(png|jpg|jpeg|webp|svg)$/i.test(name)) files.push(relative(assetsDir, full).split('\\').join('/'));
  }
  return files;
}

mkdirSync(assetsDir, { recursive: true });
const files = walk(assetsDir).sort();
writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, 2) + '\n');
console.log(`[manifest] ${files.length} assets → public/assets/manifest.json`);
