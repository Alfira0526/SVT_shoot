// 14정령·보스·노이즈 초상화(110×120) 생성 — 오픈소스 Twemoji(CC BY 4.0) 얼굴·소품을 색·구도만 바꿔 합성.
// 원본 SVG: public/assets/emoji/<codepoint>.svg (jdecked/twemoji). 출처 표기는 CREDITS.md·정보 화면.
// 실행: `npm run portraits`  → public/assets/portraits/pt_*.png 덮어쓰기 (파일명 유지 → 코드 수정 불필요)
// 매핑은 아래 SPIRITS를 고치면 됨 (T1 상징 매핑은 발주자 결정 — 동물은 정령 컨셉 기준 임시 배정).
import sharp from 'sharp';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const emojiDir = join(root, 'public', 'assets', 'emoji');
const outDir = join(root, 'public', 'assets', 'portraits');
const W = 110;
const H = 120;

// 정령 이름 · 파일 키 · 컬러 · 얼굴 이모지 · 시그니처 소품 (라이트&위트 대개편 §3 기준)
const SPIRITS = [
  { key: 'bongi',   name: '루멘(봉이)', color: '#ffd66b', glow: '#fff3c4', face: '1f425', prop: '1fa84', extra: '2b50' },   // 병아리 + 응원봉(마법봉) + 별
  { key: 'pollin',  name: '폴린(입덕)', color: '#ff9ecb', glow: '#ffd1e8', face: '1f430', prop: '1f497' },                  // 토끼 + 하트
  { key: 'pick',    name: '픽(뽑기)',   color: '#b18cff', glow: '#d9c8ff', face: '1f431', prop: '1f3b4', extra: '2728' },   // 고양이 + 화투(포카) + 반짝
  { key: 'saerok',  name: '새록(새로고침)', color: '#86c8ff', glow: '#c2e3ff', face: '1f989', prop: '1f504' },              // 부엉이 + 새로고침
  { key: 'bitjang', name: '빗장(캡차)', color: '#ff8a5c', glow: '#ffc2a6', face: '1f98a', prop: '1f511' },                  // 여우 + 열쇠
  { key: 'ulrim',   name: '울림(떼창)', color: '#7fe6c6', glow: '#c6f5e8', face: '1f438', prop: '1f3a7', extra: '1f3b5' },  // 개구리 + 헤드폰 + 음표
  { key: 'semi',    name: '셈이(총공)', color: '#cfa8ff', glow: '#e8d9ff', face: '1f43c', prop: '1f4cb', extra: '1f453' },  // 판다 + 체크리스트 + 안경
  { key: 'yeongsu', name: '영수(굿즈)', color: '#ffd66b', glow: '#ffe9a8', face: '1f439', prop: '1f6cd' },                  // 햄스터 + 쇼핑백
  { key: 'chalna',  name: '찰나(직캠)', color: '#ff8a5c', glow: '#ffc2a6', face: '1f99d', prop: '1f4f7' },                  // 너구리 + 카메라
  { key: 'diwon',   name: '디원(컴백)', color: '#ffe066', glow: '#fff0b3', face: '1f42f', prop: '1f4c5' },                  // 호랑이 + 달력
  { key: 'nesi',    name: '네시(새벽)', color: '#9fa8ff', glow: '#d0d4ff', face: '1f428', prop: '1f319', extra: '2b50' },   // 코알라 + 달 + 별
  { key: 'yeobaek', name: '여백(졸업)', color: '#d8b4ff', glow: '#ecdcff', face: '1f411', prop: '1f380' },                  // 양 + 리본
  { key: 'seupjak', name: '습작(팬창작)', color: '#86c8ff', glow: '#c2e3ff', face: '1f42d', prop: '1f58c' },                // 생쥐 + 붓
  { key: 'janbul',  name: '잔불(버티기)', color: '#ff9a5c', glow: '#ffc9a3', face: '1f43b', prop: '1f3ee' },                // 곰 + 등불
];

// 적·보스 초상화 — 키는 기존 파일명 그대로
const OTHERS = [
  { file: 'pt_noise',         color: '#8a7fe0', glow: '#b18cff', face: '1f47e', prop: '1f4e1', dark: true },           // 노이즈: 외계 침입자 + 안테나
  { file: 'pt_server',        color: '#86c8ff', glow: '#5a8fd0', face: '1f5c4', prop: '1f9fe', dark: true },           // 티켓팅 서버: 서버랙 + 대기표
  { file: 'pt_scalper_sell',  color: '#ff8a5c', glow: '#ffb37f', face: '1f40d', prop: '1f3ab', dark: true },           // 암표 총책(영업): 뱀 + 티켓
  { file: 'pt_scalper_smug',  color: '#ff8a5c', glow: '#ffb37f', face: '1f40d', prop: '1f4b8', dark: true },           // (능청): 뱀 + 돈
  { file: 'pt_scalper_crack', color: '#ff6b8a', glow: '#ff9ecb', face: '1f40d', prop: '1f4a5', dark: true },           // (균열): 뱀 + 충격
  { file: 'pt_monopolist',    color: '#4a2f7f', glow: '#b18cff', face: '1f311', prop: '1f451', dark: true },           // 독점자: 그믐달 + 왕관
  { file: 'pt_mugyeol',       color: '#3a3566', glow: '#ffd66b', face: '1f425', prop: '1f380', dark: true, shadow: true }, // 무결: 루멘의 그림자 + 금빛 리본
];

function svg(code) {
  const p = join(emojiDir, `${code}.svg`);
  if (!existsSync(p)) throw new Error(`missing emoji svg: ${code}`);
  return readFileSync(p);
}

async function raster(code, size, opts = {}) {
  let img = sharp(svg(code), { density: 300 }).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (opts.silhouette) {
    // 실루엣: 알파만 남기고 단색으로 (무결 = 루멘의 그림자)
    img = img.ensureAlpha().tint(opts.silhouette).modulate({ brightness: 0.25, saturation: 0.6 });
  }
  return img.png().toBuffer();
}

function background({ color, glow, dark }) {
  const base = dark ? '#1a1733' : '#272250';
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <radialGradient id="g" cx="0.5" cy="0.42" r="0.55">
        <stop offset="0" stop-color="${glow}" stop-opacity="${dark ? 0.35 : 0.55}"/>
        <stop offset="1" stop-color="${glow}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" rx="14" fill="${base}"/>
    <rect width="${W}" height="${H}" rx="14" fill="url(#g)"/>
    <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="13" fill="none" stroke="${color}" stroke-width="2" opacity="0.9"/>
    <circle cx="16" cy="18" r="2" fill="${color}" opacity="0.8"/><circle cx="94" cy="104" r="2" fill="${color}" opacity="0.6"/>
  </svg>`);
}

async function portrait(spec, outFile) {
  const layers = [];
  const faceSize = 70;
  const face = await raster(spec.face, faceSize, spec.shadow ? { silhouette: '#2a2450' } : {});
  layers.push({ input: face, left: Math.round((W - faceSize) / 2), top: 14 });
  if (spec.prop) {
    const propSize = 36;
    layers.push({ input: await raster(spec.prop, propSize), left: W - propSize - 8, top: H - propSize - 8 });
  }
  if (spec.extra) {
    const exSize = 22;
    layers.push({ input: await raster(spec.extra, exSize), left: 10, top: 12 });
  }
  await sharp(background(spec)).composite(layers).png().toFile(join(outDir, `${outFile}.png`));
}

for (const s of SPIRITS) {
  await portrait(s, `pt_g_${s.key}`);
  console.log(`[portrait] pt_g_${s.key}  ${s.name}`);
}
for (const o of OTHERS) {
  await portrait(o, o.file);
  console.log(`[portrait] ${o.file}`);
}
console.log('done');
