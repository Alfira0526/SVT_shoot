// 프롤로그 컷씬 C1~C5 + 카드 뒷면 — SVG 레이어 합성으로 생성 (480×800, D31 규격).
// 전부 이 프로젝트에서 그린 오리지널 벡터 + Twemoji 반짝이(CC BY 4.0)만 사용. 실존 인물·공식 이미지 참조 없음.
// 실행: `npm run cutscenes` → public/assets/cutscenes/*.png 덮어쓰기 (파일명 유지 → 코드 수정 불필요)
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const emojiDir = join(root, 'public', 'assets', 'emoji');
const outDir = join(root, 'public', 'assets', 'cutscenes');
const W = 480;
const H = 800;

const C = {
  deep: '#1e1b3a', panel: '#272250', ink: '#0f0d21', rose: '#ff9ecb', serenity: '#86c8ff', cream: '#fff3c4',
  lemon: '#ffe066', grape: '#b18cff', coral: '#ff8a5c', mint: '#7fe6c6', danger: '#ff6b8a', night: '#120f26', violet: '#4a2f7f',
};

let seed = 11;
const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const R = (a, b) => a + rand() * (b - a);

function emoji(code, x, y, size, extra = '') {
  const inner = readFileSync(join(emojiDir, `${code}.svg`), 'utf8').replace(/^﻿/, '').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 36 36" ${extra}>${inner}</svg>`;
}

function stars(n, yMax = H, alpha = 0.8) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = R(0, W);
    const y = R(0, yMax);
    const r = rand() < 0.15 ? 2.2 : 1.2;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${[C.cream, C.rose, C.serenity][i % 3]}" opacity="${(0.25 + rand() * alpha).toFixed(2)}"/>`;
  }
  return s;
}

function bokeh(n, yMin, yMax, colors) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const r = R(14, 44);
    s += `<circle cx="${R(-20, W + 20).toFixed(1)}" cy="${R(yMin, yMax).toFixed(1)}" r="${r.toFixed(1)}" fill="${colors[i % colors.length]}" opacity="${R(0.08, 0.22).toFixed(2)}"/>`;
  }
  return s;
}

// 인파 실루엣 한 줄 — 머리·어깨, 손에 든 응원봉 빛
function crowdRow(y, scale, color, count, lights = true) {
  let s = '';
  const step = W / count;
  for (let i = 0; i < count + 1; i++) {
    const x = i * step + R(-10, 10) - step / 2;
    const h = (70 + R(-10, 20)) * scale;
    const w = 44 * scale;
    s += `<g opacity="0.95">
      <circle cx="${x}" cy="${y - h}" r="${15 * scale}" fill="${color}"/>
      <rect x="${x - w / 2}" y="${y - h + 12 * scale}" width="${w}" height="${h + 40}" rx="${16 * scale}" fill="${color}"/>`;
    if (lights && rand() < 0.75) {
      const lx = x + (rand() < 0.5 ? -1 : 1) * 22 * scale;
      const ly = y - h - R(10, 40) * scale;
      const col = [C.lemon, C.rose, C.serenity, C.mint][Math.floor(rand() * 4)];
      s += `<rect x="${lx - 2}" y="${ly}" width="4" height="${26 * scale}" rx="2" fill="${C.cream}" opacity="0.9"/>
        <circle cx="${lx}" cy="${ly}" r="${12 * scale}" fill="${col}" opacity="0.25"/>
        <circle cx="${lx}" cy="${ly}" r="${5 * scale}" fill="${col}"/>`;
    }
    s += '</g>';
  }
  return s;
}

// 주인공 뒷모습 — 후드, 가방끈, 오른손 응원봉 (얼굴 없음: 자기투영 유지)
function hero(x, y, scale = 1, opts = {}) {
  const tilt = opts.tilt || 0;
  const stick = opts.stick !== false;
  return `<g transform="translate(${x} ${y}) rotate(${tilt}) scale(${scale})">
    <ellipse cx="0" cy="150" rx="70" ry="14" fill="${C.ink}" opacity="0.35"/>
    <rect x="-52" y="0" width="104" height="160" rx="36" fill="${opts.body || '#2d2757'}"/>
    <rect x="-52" y="0" width="104" height="160" rx="36" fill="url(#rim)" opacity="0.9"/>
    <path d="M-30 0 Q-40 -60 0 -70 Q40 -60 30 0 Z" fill="${opts.hood || '#3a3566'}"/>
    <ellipse cx="0" cy="-26" rx="34" ry="36" fill="${opts.hood || '#3a3566'}"/>
    <ellipse cx="0" cy="-24" rx="30" ry="32" fill="${opts.hoodIn || '#241f49'}"/>
    <rect x="-56" y="20" width="12" height="120" rx="6" fill="${opts.strap || C.grape}" opacity="0.8"/>
    ${stick ? `<g transform="translate(58 -20) rotate(${opts.stickTilt ?? -12})">
      <rect x="-5" y="0" width="10" height="90" rx="5" fill="${C.cream}"/>
      <circle cx="0" cy="-6" r="26" fill="${C.lemon}" opacity="0.28"/>
      <circle cx="0" cy="-6" r="14" fill="${C.lemon}"/>
      <circle cx="0" cy="-6" r="6" fill="#ffffff"/>
    </g>` : ''}
  </g>`;
}

function defs() {
  return `<defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.deep}"/><stop offset="0.55" stop-color="${C.violet}"/><stop offset="1" stop-color="#8a4a8f"/></linearGradient>
    <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2358"/><stop offset="1" stop-color="#ff9ecb"/></linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.25"/><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="${C.lemon}" stop-opacity="0.35"/></linearGradient>
    <radialGradient id="glowY" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${C.lemon}" stop-opacity="0.9"/><stop offset="0.5" stop-color="${C.lemon}" stop-opacity="0.25"/><stop offset="1" stop-color="${C.lemon}" stop-opacity="0"/></radialGradient>
    <radialGradient id="glowW" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset="0.35" stop-color="${C.cream}" stop-opacity="0.8"/><stop offset="1" stop-color="${C.rose}" stop-opacity="0"/></radialGradient>
    <radialGradient id="glowP" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${C.rose}" stop-opacity="0.5"/><stop offset="1" stop-color="${C.rose}" stop-opacity="0"/></radialGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.cream}" stop-opacity="0.35"/><stop offset="1" stop-color="${C.cream}" stop-opacity="0"/></linearGradient>
    <linearGradient id="cardF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7d6"/><stop offset="1" stop-color="${C.cream}"/></linearGradient>
    <linearGradient id="cardB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c9a6ff"/><stop offset="1" stop-color="#7d5bd6"/></linearGradient>
    <linearGradient id="vignetteR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.danger}" stop-opacity="0.35"/><stop offset="0.5" stop-color="${C.danger}" stop-opacity="0"/><stop offset="1" stop-color="${C.danger}" stop-opacity="0.45"/></linearGradient>
  </defs>`;
}

// 카드 — 앞면(별 문양) / 뒷면(다이아 문양). 오리지널 디자인.
function card(x, y, w, h, rot = 0, front = true, accent = C.rose) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const inner = front
    ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w * 0.1}" fill="url(#cardF)"/>
       <rect x="${x + w * 0.08}" y="${y + h * 0.06}" width="${w * 0.84}" height="${h * 0.88}" rx="${w * 0.07}" fill="none" stroke="${accent}" stroke-width="${Math.max(1.5, w * 0.03)}"/>
       <circle cx="${cx}" cy="${cy - h * 0.08}" r="${w * 0.26}" fill="${accent}" opacity="0.85"/>
       <circle cx="${cx}" cy="${cy - h * 0.08}" r="${w * 0.12}" fill="${C.lemon}"/>
       <rect x="${cx - w * 0.25}" y="${cy + h * 0.24}" width="${w * 0.5}" height="${h * 0.04}" rx="2" fill="${C.grape}"/>
       <rect x="${cx - w * 0.16}" y="${cy + h * 0.32}" width="${w * 0.32}" height="${h * 0.04}" rx="2" fill="${C.grape}"/>`
    : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w * 0.1}" fill="url(#cardB)"/>
       <rect x="${x + w * 0.07}" y="${y + h * 0.05}" width="${w * 0.86}" height="${h * 0.9}" rx="${w * 0.07}" fill="none" stroke="${C.cream}" stroke-width="${Math.max(1.5, w * 0.03)}"/>
       <polygon points="${cx},${cy - h * 0.2} ${cx + w * 0.26},${cy} ${cx},${cy + h * 0.2} ${cx - w * 0.26},${cy}" fill="${C.cream}" opacity="0.9"/>
       <polygon points="${cx},${cy - h * 0.1} ${cx + w * 0.13},${cy} ${cx},${cy + h * 0.1} ${cx - w * 0.13},${cy}" fill="#7d5bd6"/>`;
  return `<g transform="rotate(${rot} ${cx} ${cy})"><rect x="${x + 3}" y="${y + 5}" width="${w}" height="${h}" rx="${w * 0.1}" fill="${C.ink}" opacity="0.35"/>${inner}</g>`;
}

function wrap(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs()}${body}</svg>`;
}

// ── C1 콘서트장 앞: 설렘 ───────────────────────────────────
function c1() {
  seed = 11;
  let s = `<rect width="${W}" height="${H}" fill="url(#sky)"/>${stars(140, 420, 0.7)}`;
  // 경기장 실루엣 + 입구 빛 + 스포트라이트
  s += `<path d="M-20 430 Q240 300 500 430 L500 520 L-20 520 Z" fill="#2a2458"/>`;
  s += `<rect x="150" y="400" width="180" height="120" rx="18" fill="#33295f"/>`;
  s += `<rect x="200" y="446" width="80" height="74" rx="8" fill="${C.lemon}" opacity="0.9"/><rect x="214" y="460" width="52" height="60" rx="4" fill="#fff7d6"/>`;
  for (const [x, a] of [[120, -18], [360, 18], [240, 0]]) {
    s += `<polygon points="${x},470 ${x - 90 + a * 2},40 ${x + 90 + a * 2},40" fill="url(#beam)" transform="rotate(${a} ${x} 470)"/>`;
  }
  s += `<rect x="160" y="380" width="160" height="16" rx="8" fill="${C.rose}"/><rect x="176" y="383" width="128" height="10" rx="5" fill="${C.cream}" opacity="0.8"/>`;
  s += bokeh(22, 300, 560, [C.rose, C.serenity, C.lemon]);
  // 먼 인파 → 가까운 인파
  s += crowdRow(640, 0.65, '#231f47', 10);
  s += crowdRow(720, 0.9, '#1a1636', 8);
  s += hero(240, 470, 1.05, { stickTilt: -20 });
  s += crowdRow(800, 1.15, '#120f26', 6);
  s += `<rect width="${W}" height="${H}" fill="url(#glowP)" opacity="0.6"/>`;
  s += emoji('2728', 300, 330, 44) + emoji('2728', 110, 250, 30) + emoji('2b50', 380, 180, 26);
  return wrap(s);
}

// ── C2 부스: 카드 한 장 ─────────────────────────────────────
function c2() {
  seed = 23;
  let s = `<rect width="${W}" height="${H}" fill="#241f4a"/>${stars(60, 220, 0.5)}`;
  // 전구 줄
  s += `<path d="M0 90 Q120 140 240 90 Q360 40 480 90" fill="none" stroke="#3a3566" stroke-width="3"/>`;
  for (let i = 0; i < 9; i++) {
    const x = 20 + i * 55;
    const y = 90 + Math.sin((i / 8) * Math.PI * 2) * -24 + 24;
    s += `<circle cx="${x}" cy="${y + 10}" r="18" fill="${C.lemon}" opacity="0.18"/><circle cx="${x}" cy="${y + 10}" r="7" fill="${C.lemon}"/>`;
  }
  // 부스: 차양·기둥·카운터
  s += `<rect x="40" y="160" width="400" height="70" rx="10" fill="${C.rose}"/>`;
  for (let i = 0; i < 8; i++) s += `<rect x="${40 + i * 50}" y="160" width="25" height="70" rx="6" fill="${C.cream}"/>`;
  s += `<path d="M40 230 ${Array.from({ length: 8 }, (_, i) => `Q${65 + i * 50} 262 ${90 + i * 50} 230`).join(' ')}" fill="${C.rose}"/>`;
  s += `<rect x="52" y="230" width="14" height="300" fill="#3a3566"/><rect x="414" y="230" width="14" height="300" fill="#3a3566"/>`;
  s += `<rect x="40" y="480" width="400" height="90" rx="12" fill="#3f3875"/><rect x="40" y="480" width="400" height="14" rx="6" fill="#5a52a0"/>`;
  s += `<rect x="70" y="250" width="340" height="220" rx="10" fill="#1a1636"/>`;
  // 진열된 카드 뒷면들
  for (let i = 0; i < 4; i++) s += card(96 + i * 78, 290, 56, 86, R(-6, 6), false);
  // 카운터 위 — 뒤집을 카드 한 장 (크게)
  s += `<ellipse cx="240" cy="640" rx="120" ry="40" fill="url(#glowY)" opacity="0.7"/>`;
  s += card(170, 540, 140, 210, -4, false);
  s += emoji('2728', 300, 520, 40) + emoji('2728', 150, 700, 28) + emoji('2b50', 330, 640, 22);
  s += `<rect width="${W}" height="${H}" fill="url(#glowP)" opacity="0.4"/>`;
  return wrap(s);
}

// ── C3 13장 전체 공개: 번쩍 ────────────────────────────────
function c3() {
  seed = 37;
  let s = `<rect width="${W}" height="${H}" fill="${C.rose}"/><rect width="${W}" height="${H}" fill="url(#glowW)"/>`;
  // 방사선
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * 360;
    s += `<polygon points="240,330 ${240 + Math.cos((a * Math.PI) / 180) * 520},${330 + Math.sin((a * Math.PI) / 180) * 520} ${240 + Math.cos(((a + 7) * Math.PI) / 180) * 520},${330 + Math.sin(((a + 7) * Math.PI) / 180) * 520}" fill="#ffffff" opacity="${i % 2 ? 0.18 : 0.08}"/>`;
  }
  // 13장 원형 배치
  for (let i = 0; i < 13; i++) {
    const a = -90 + (i / 13) * 360;
    const rad = (a * Math.PI) / 180;
    const cx = 240 + Math.cos(rad) * 170;
    const cy = 330 + Math.sin(rad) * 190;
    const accent = [C.rose, C.serenity, C.lemon, C.mint, C.grape, C.coral][i % 6];
    s += card(cx - 32, cy - 48, 64, 96, a + 90, true, accent);
  }
  s += `<circle cx="240" cy="330" r="70" fill="#ffffff" opacity="0.95"/><circle cx="240" cy="330" r="110" fill="#ffffff" opacity="0.35"/>`;
  s += emoji('1f31f', 60, 120, 56) + emoji('2728', 380, 100, 48) + emoji('2728', 40, 480, 40) + emoji('1f31f', 390, 500, 50) + emoji('2728', 200, 560, 36);
  // 색종이
  for (let i = 0; i < 40; i++) {
    s += `<rect x="${R(0, W)}" y="${R(0, H)}" width="10" height="5" rx="1" fill="${[C.rose, C.serenity, C.lemon, C.mint, C.grape][i % 5]}" transform="rotate(${R(0, 360)} ${R(0, W)} ${R(0, H)})" opacity="0.9"/>`;
  }
  s += hero(240, 640, 0.9, { body: '#3a3566', hood: '#4a4480', hoodIn: '#2d2757', stick: false });
  return wrap(s);
}

// ── C4 사고 순간: 긴박 ──────────────────────────────────────
function c4() {
  seed = 51;
  let s = `<rect width="${W}" height="${H}" fill="#1a1234"/>`;
  s += `<g transform="rotate(-9 240 400)">`;
  s += stars(50, 300, 0.4);
  s += `<path d="M-60 430 Q240 320 540 430 L540 560 L-60 560 Z" fill="#241f4a"/>`;
  // 속도선
  for (let i = 0; i < 26; i++) {
    const y = R(120, 720);
    s += `<rect x="${R(-80, 360)}" y="${y}" width="${R(90, 260)}" height="${R(2, 5)}" rx="2" fill="${i % 3 ? C.serenity : C.danger}" opacity="${R(0.15, 0.5)}"/>`;
  }
  // 밀려드는 인파 (가까이, 크게, 기울어짐)
  s += crowdRow(560, 0.9, '#2a2458', 9, false);
  s += crowdRow(700, 1.4, '#151230', 6, false);
  // 흩어지는 카드
  for (let i = 0; i < 9; i++) s += card(R(10, 400), R(80, 520), 52, 78, R(-80, 80), i % 2 === 0, [C.rose, C.serenity, C.lemon][i % 3]);
  // 휘청이는 주인공 + 떨어지는 폰
  s += hero(230, 420, 1, { tilt: 16, stickTilt: 40 });
  s += `<g transform="translate(120 540) rotate(-28)"><rect x="-22" y="-40" width="44" height="80" rx="8" fill="${C.ink}"/><rect x="-18" y="-34" width="36" height="66" rx="5" fill="#2d2757"/>`;
  for (let i = 0; i < 6; i++) s += `<rect x="-18" y="${-30 + i * 10}" width="${R(10, 36)}" height="3" fill="${[C.rose, C.serenity, C.danger][i % 3]}" opacity="0.9"/>`;
  s += `</g></g>`;
  s += `<rect width="${W}" height="${H}" fill="url(#vignetteR)"/>`;
  s += emoji('1f4a5', 300, 250, 90) + emoji('1f4a5', 40, 150, 56);
  return wrap(s);
}

// ── C5 응원봉 클로즈업: 봉이의 첫 목소리 ────────────────────
function c5() {
  seed = 73;
  let s = `<rect width="${W}" height="${H}" fill="${C.night}"/>${stars(40, 300, 0.3)}`;
  for (let i = 5; i > 0; i--) s += `<circle cx="240" cy="330" r="${i * 60}" fill="${C.lemon}" opacity="${0.06 + (5 - i) * 0.03}"/>`;
  // 손 실루엣 + 응원봉
  s += `<path d="M150 800 L150 620 Q150 560 200 560 L280 560 Q330 560 330 620 L330 800 Z" fill="#2d2757"/>`;
  s += `<rect x="178" y="520" width="124" height="80" rx="30" fill="#3a3566"/>`;
  for (let i = 0; i < 4; i++) s += `<rect x="${188 + i * 28}" y="505" width="22" height="70" rx="11" fill="#3a3566"/>`;
  s += `<rect x="222" y="300" width="36" height="260" rx="14" fill="${C.cream}"/><rect x="230" y="310" width="8" height="200" rx="4" fill="#ffffff" opacity="0.6"/>`;
  s += `<circle cx="240" cy="300" r="112" fill="url(#glowY)"/><circle cx="240" cy="300" r="74" fill="${C.lemon}"/><circle cx="240" cy="300" r="52" fill="#fff7d6"/><circle cx="240" cy="300" r="26" fill="#ffffff"/>`;
  // 정체 유예: 빛 속의 작은 반짝임만
  s += emoji('2728', 268, 232, 40) + emoji('2b50', 150, 170, 34) + emoji('2728', 330, 380, 30) + emoji('1f31f', 90, 420, 44) + emoji('2728', 360, 140, 26);
  return wrap(s);
}

// ── 카드 뒷면 220×344 ───────────────────────────────────────
function cardBack() {
  seed = 91;
  const w = 220;
  const h = 344;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs()}`;
  s += `<rect width="${w}" height="${h}" rx="18" fill="url(#cardB)"/>`;
  for (let y = 24; y < h - 24; y += 28) for (let x = 24; x < w - 24; x += 28) s += `<polygon points="${x},${y - 7} ${x + 7},${y} ${x},${y + 7} ${x - 7},${y}" fill="#ffffff" opacity="0.08"/>`;
  s += `<rect x="10" y="10" width="${w - 20}" height="${h - 20}" rx="14" fill="none" stroke="${C.cream}" stroke-width="4"/>`;
  s += `<circle cx="${w / 2}" cy="${h / 2}" r="64" fill="${C.cream}" opacity="0.12"/>`;
  s += `<polygon points="${w / 2},${h / 2 - 54} ${w / 2 + 44},${h / 2} ${w / 2},${h / 2 + 54} ${w / 2 - 44},${h / 2}" fill="${C.cream}"/>`;
  s += `<polygon points="${w / 2},${h / 2 - 30} ${w / 2 + 24},${h / 2} ${w / 2},${h / 2 + 30} ${w / 2 - 24},${h / 2}" fill="#7d5bd6"/>`;
  s += emoji('2728', 28, 28, 30) + emoji('2728', w - 58, h - 58, 30);
  s += `</svg>`;
  return s;
}

const jobs = [
  ['c1_concert', c1()],
  ['c2_booth', c2()],
  ['c3_reveal', c3()],
  ['c4_accident', c4()],
  ['c5_wand', c5()],
  ['card_back', cardBack()],
];
for (const [name, svg] of jobs) {
  await sharp(Buffer.from(svg), { density: 96 }).png({ compressionLevel: 9 }).toFile(join(outDir, `${name}.png`));
  console.log(`[cutscene] ${name}.png`);
}
