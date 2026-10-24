// 실사 배경 가공 — public/assets/bg/<key>.jpg(원본, Commons CC0) → 480×800 세로 크롭 + 세계 팔레트 톤 + 하단 어둡게(대사창 영역) + 비네트.
// 출력: public/assets/backdrops/<key>.jpg (세계·피날레) / public/assets/cutscenes/c*.png (프롤로그 컷씬, 기존 파일명 유지 → 코드 수정 불필요)
// 디자인 방향(2026-10-24): 도트 전제 폐기 → '사진 듀오톤 + 플랫 벡터 UI'. 사진은 분위기 레이어라 저대비·저채도로 눌러 탄막 가독성을 지킨다.
// 실행: `npm run backdrops`
import sharp from 'sharp';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'raw', 'bg'); // 원본(1280px)은 배포물에 넣지 않는다 — raw/는 빌드 입력 전용
const outWorld = join(root, 'public', 'assets', 'backdrops');
const outCut = join(root, 'public', 'assets', 'cutscenes');
mkdirSync(outWorld, { recursive: true });
const W = 480, H = 800;

// key → { tint: 세계 팔레트(그림자 쪽), hi: 하이라이트 쪽, sat: 채도, bright: 밝기, pos: 크롭 기준 }
// 세계 배경은 플레이 가독성용으로 어둡게(bright 0.55~0.7), 컷씬은 서사용이라 밝게(0.8~0.95).
const SPEC = {
  // 프롤로그 컷씬 — 밝고 따뜻하게. 피사체 상단 2/3(하단은 자막 패널).
  c1_concert:  { cut: true, tint: '#2a1b4a', hi: '#ff9ecb', sat: 0.9, bright: 0.9, pos: 'attention' },
  c2_booth:    { cut: true, tint: '#1e1b3a', hi: '#86c8ff', sat: 0.7, bright: 0.85, pos: 'attention' },
  c3_reveal:   { cut: true, tint: '#2a1a2e', hi: '#fff3c4', sat: 1.0, bright: 1.0, pos: 'attention', burst: true },
  c4_accident: { cut: true, tint: '#3a1526', hi: '#ff6b8a', sat: 0.6, bright: 0.75, pos: 'attention', streaks: true },
  c5_wand:     { cut: true, tint: '#1a1730', hi: '#fff3c4', sat: 0.8, bright: 0.9, pos: 'attention', orb: true },
  // 13세계 + 피날레
  w_pollin:  { tint: '#241238', hi: '#ff9ecb', sat: 0.5, bright: 0.62, pos: 'left' }, // 건물 올려다보는 구도가 왼쪽에 있음
  w_pick:    { tint: '#1a1d3a', hi: '#86c8ff', sat: 0.45, bright: 0.6, pos: 'attention' },
  w_saerok:  { tint: '#1e2434', hi: '#bfe0ff', sat: 0.35, bright: 0.62, pos: 'attention' },
  w_bitjang: { tint: '#241020', hi: '#ff6b8a', sat: 0.45, bright: 0.6, pos: 'attention' },
  w_ulrim:   { tint: '#122c22', hi: '#7fe6c6', sat: 0.55, bright: 0.62, pos: 'attention' },
  w_semi:    { tint: '#1c1734', hi: '#cfa8ff', sat: 0.4, bright: 0.58, pos: 'attention' },
  w_yeongsu: { tint: '#261d0e', hi: '#ffd66b', sat: 0.5, bright: 0.6, pos: 'attention' },
  w_chalna:  { tint: '#221410', hi: '#ff9a7a', sat: 0.55, bright: 0.68, pos: 'attention' },
  w_diwon:   { tint: '#22190a', hi: '#ffe066', sat: 0.5, bright: 0.6, pos: 'attention' },
  w_nesi:    { tint: '#101628', hi: '#9fa8ff', sat: 0.45, bright: 0.62, pos: 'attention' },
  w_yeobaek: { tint: '#1a1332', hi: '#d8b4ff', sat: 0.4, bright: 0.6, pos: 'attention' },
  w_seupjak: { tint: '#141a2c', hi: '#86c8ff', sat: 0.5, bright: 0.65, pos: 'attention' },
  w_janbul:  { tint: '#16141c', hi: '#ff9a5c', sat: 0.6, bright: 0.6, pos: 'attention' },
  mugyeol:   { tint: '#140c22', hi: '#ffd66b', sat: 0.35, bright: 0.55, pos: 'attention' },
};

const hex = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });

// 오버레이 SVG: 세계색 컬러 워시 + 하단 그라데이션(대사창·HUD 가독) + 비네트 + 선택 효과
function overlay(spec) {
  const t = spec.tint, hi = spec.hi;
  const bottomStop = spec.cut ? 0.62 : 0.5;
  const extra = [
    spec.burst ? `<circle cx="${W / 2}" cy="${H * 0.4}" r="230" fill="url(#burst)"/>` : '',
    spec.orb ? `<circle cx="${W / 2}" cy="${H * 0.36}" r="150" fill="url(#burst)"/>` : '',
    spec.streaks ? Array.from({ length: 6 }, (_, i) => `<rect x="0" y="${120 + i * 70}" width="${W}" height="${3 + (i % 3)}" fill="${hi}" opacity="0.35"/>`).join('') : '',
  ].join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="wash" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${hi}" stop-opacity="${spec.cut ? 0.10 : 0.14}"/>
        <stop offset="0.3" stop-color="${t}" stop-opacity="${spec.cut ? 0.18 : 0.42}"/>
        <stop offset="${bottomStop}" stop-color="${t}" stop-opacity="${spec.cut ? 0.45 : 0.72}"/>
        <stop offset="1" stop-color="${t}" stop-opacity="${spec.cut ? 0.92 : 0.97}"/>
      </linearGradient>
      <radialGradient id="vig" cx="0.5" cy="0.42" r="0.75">
        <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="${t}" stop-opacity="0.75"/>
      </radialGradient>
      <radialGradient id="burst" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${hi}" stop-opacity="0.85"/>
        <stop offset="0.45" stop-color="${hi}" stop-opacity="0.25"/>
        <stop offset="1" stop-color="${hi}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#wash)"/>
    <rect width="${W}" height="${H}" fill="url(#vig)"/>
    ${extra}
  </svg>`);
}

// 필름 그레인 — 사진마다 다른 압축 질감을 통일. 아주 옅게.
async function grain() {
  const n = W * H;
  const buf = Buffer.alloc(n);
  let s = 1234567;
  for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; buf[i] = 118 + (s % 20); }
  return sharp(buf, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
}

const grainPng = await grain();
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;
for (const [key, spec] of Object.entries(SPEC)) {
  if (only && !only.includes(key)) continue;
  const src = join(srcDir, `${key}.jpg`);
  if (!existsSync(src)) { console.warn(`[backdrop] ${key}: 원본 없음 (npm run bg 먼저)`); continue; }
  const t = hex(spec.tint);
  const position = spec.pos === 'attention' ? sharp.strategy.attention : spec.pos;
  // 세계 배경은 탄(2~4px)·몹이 위에 올라가므로 컷씬보다 한 단계 더 어둡고 흐리게(블러 1.2) 눌러 질감만 남긴다
  const bright = spec.cut ? spec.bright : spec.bright * 0.82;
  const soften = (s) => (spec.cut ? s : s.blur(1.2));
  let img = soften(sharp(src).rotate()
    .resize(W, H, { fit: 'cover', position }))
    .modulate({ saturation: spec.sat, brightness: bright });
  // 듀오톤에 가까운 틴트: 그림자를 세계색으로 끌어당긴다(tint) → 사진마다 다른 색온도를 한 팔레트로
  img = img.tint(t).modulate({ saturation: 1.15 });
  // 원본 색을 일부 되살려 완전 단색을 피한다(사진 질감 유지)
  const tinted = await img.png().toBuffer();
  const orig = await soften(sharp(src).rotate().resize(W, H, { fit: 'cover', position }))
    .modulate({ saturation: spec.sat, brightness: bright }).png().toBuffer();
  const out = sharp(tinted).composite([
    { input: orig, blend: 'over', opacity: 0.45 },
    { input: overlay(spec), blend: 'over' },
    { input: grainPng, blend: 'soft-light', opacity: 0.35 },
  ]);
  if (spec.cut) {
    await out.png({ compressionLevel: 9 }).toFile(join(outCut, `${key}.png`));
  } else {
    await out.jpeg({ quality: 78, mozjpeg: true }).toFile(join(outWorld, `${key}.jpg`));
  }
  console.log(`[backdrop] ${key} → ${spec.cut ? 'cutscenes/' + key + '.png' : 'backdrops/' + key + '.jpg'}`);
}
console.log('done');
