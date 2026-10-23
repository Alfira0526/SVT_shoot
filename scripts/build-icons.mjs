// favicon.svg → 홈 화면 아이콘(192/512) + 공유용 og.png(1200×630) 생성. 1회성: `npm run icons`
// 색은 constants.js의 트와일라잇 캔디 팔레트와 동일.
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
mkdirSync(join(pub, 'icons'), { recursive: true });

const favicon = readFileSync(join(pub, 'favicon.svg'));
for (const size of [192, 512]) {
  await sharp(favicon, { density: 300 }).resize(size, size).png().toFile(join(pub, 'icons', `icon-${size}.png`));
  console.log(`[icons] icon-${size}.png`);
}

// OG 이미지: 그라데이션 + 별 + 요정 엠블럼 + 제목. 텍스트는 시스템 한글 폰트(Malgun Gothic 등)에 의존.
const fairy = readFileSync(join(pub, 'assets', 'icons', 'icon_bongi.svg'), 'utf8')
  .replace(/^﻿/, '')
  .replace(/^<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '')
  .replace(/fill="#fff"/g, 'fill="#ffe066"');

let stars = '';
let seed = 7;
const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
for (let i = 0; i < 120; i++) {
  const x = Math.round(rand() * 1200);
  const y = Math.round(rand() * 630);
  const r = rand() < 0.2 ? 2.2 : 1.3;
  const c = ['#fff3c4', '#ff9ecb', '#86c8ff'][i % 3];
  stars += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="${(0.3 + rand() * 0.5).toFixed(2)}"/>`;
}

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1e1b3a"/>
      <stop offset="1" stop-color="#4a2f7f"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffe066" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#ffe066" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  ${stars}
  <circle cx="300" cy="315" r="230" fill="url(#glow)"/>
  <g transform="translate(140 155) scale(0.625)">${fairy}</g>
  <text x="560" y="300" font-family="Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, sans-serif" font-size="96" font-weight="700" fill="#fff3c4" stroke="#0f0d21" stroke-width="10" paint-order="stroke">덕질할 결심</text>
  <text x="564" y="360" font-family="Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, sans-serif" font-size="34" fill="#86c8ff">세로 탄막 슈팅 · 2~3분 공감 아케이드</text>
  <text x="564" y="420" font-family="Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, sans-serif" font-size="30" fill="#ff9ecb">"대기번호 999,999번. ……뒤로 가."</text>
  <text x="564" y="520" font-family="Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, sans-serif" font-size="22" fill="#8f8bb0">비영리 팬 창작 · 모바일 브라우저에서 바로 플레이</text>
</svg>`;

await sharp(Buffer.from(og)).png().toFile(join(pub, 'og.png'));
console.log('[icons] og.png');
