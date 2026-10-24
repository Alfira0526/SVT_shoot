// 저작권 안전한 실사 배경 수집 — Wikimedia Commons API에서 CC0 / Public domain / CC BY(2.0~4.0)만 골라 받는다.
// SA(동일조건변경허락)·NC·ND는 제외(합성 파생물의 라이선스 부담 회피). 출처는 public/assets/bg/credits.json에 기록 → CREDITS.md 반영.
// 실행: `npm run bg` [--only key]  → public/assets/bg/<key>.jpg (1280px 폭) + credits.json
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'raw', 'bg'); // 원본은 raw/ (배포 제외). 가공본은 npm run backdrops → public/assets/backdrops, cutscenes
mkdirSync(outDir, { recursive: true });
const UA = 'fan-shooter/1.0 (non-commercial fan game; contact thsjsl1234@gmail.com)';
const ALLOWED = /^(CC0|Public domain|CC BY( \d\.\d)?( [a-z]{2})?)$/i;

// key → 검색어 후보(앞에서부터 시도). 세로(480×800) 크롭을 전제로 피사체가 중앙·상단에 있는 사진이 유리.
// 'Unsplash'를 붙이면 Commons에 CC0로 이관된 Unsplash 사진(2017년 이전 CC0 라이선스 시절)이 우선 걸린다 → 출처 표기 부담 최소.
// 얼굴이 식별되는 인물 사진은 피한다(초상권·실존 인물 연상 회피) — 사물·장소·빛·뒷모습 위주.
const QUERIES = {
  c1_concert: ['concert stage lights Unsplash', 'festival lights night Unsplash', 'concert lights Unsplash', 'concert crowd Unsplash'],
  c2_booth: ['wooden table lamp night Unsplash', 'paper envelope table Unsplash', 'desk night lamp Unsplash', 'table cards Unsplash'],
  c3_reveal: ['gold bokeh Unsplash', 'glitter Unsplash', 'sparkle lights Unsplash', 'bokeh Unsplash'],
  c4_accident: ['motion blur night city Unsplash', 'light trails night Unsplash', 'blur lights Unsplash'],
  c5_wand: ['holding light dark Unsplash', 'hand light bulb dark Unsplash', 'glowing hand Unsplash'],
  w_pollin: ['looking up sky buildings Unsplash', 'sky clouds Unsplash', 'falling leaves sky Unsplash'],
  w_pick: ['deck of cards Unsplash', 'card game table Unsplash', 'shuffling cards Unsplash', 'envelopes Unsplash'],
  w_saerok: ['waiting room chairs Unsplash', 'queue people Unsplash', 'empty chairs row Unsplash'],
  w_bitjang: ['turnstile Unsplash', 'subway gate Unsplash', 'subway station Unsplash'],
  w_ulrim: ['hands in the air Unsplash', 'concert crowd hands Unsplash', 'concert Unsplash'],
  w_semi: ['laptop dark Unsplash', 'computer screen night Unsplash', 'spreadsheet Unsplash'],
  w_yeongsu: ['paper bags Unsplash', 'store shelves Unsplash', 'shop window night Unsplash', 'receipt Unsplash'],
  w_chalna: ['phone concert Unsplash', 'smartphone photo concert Unsplash', 'camera lens Unsplash'],
  w_diwon: ['clock Unsplash', 'billboard night Unsplash', 'digital clock Unsplash'],
  w_nesi: ['night window Unsplash', 'dark room light Unsplash', 'bed night Unsplash'],
  w_yeobaek: ['theater seats Unsplash', 'empty seats Unsplash', 'auditorium Unsplash'],
  w_seupjak: ['sketchbook Unsplash', 'pencil drawing Unsplash', 'art supplies Unsplash'],
  w_janbul: ['embers Unsplash', 'campfire Unsplash', 'candle dark Unsplash'],
  mugyeol: ['stage curtain Unsplash', 'red curtain Unsplash', 'spotlight Unsplash', 'fog light dark Unsplash'],
};
const rank = (l) => (/^(CC0|Public domain)$/i.test(l) ? 0 : 1); // CC0·PD 우선, 그다음 CC BY

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;
const creditsPath = join(outDir, 'credits.json');
const credits = existsSync(creditsPath) ? JSON.parse(readFileSync(creditsPath, 'utf8')) : {};

async function search(q) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(q + ' filetype:bitmap')}&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1280`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {});
  return pages
    .map((p) => {
      const ii = p.imageinfo?.[0];
      const md = ii?.extmetadata || {};
      return {
        title: p.title,
        license: md.LicenseShortName?.value || '',
        licenseUrl: md.LicenseUrl?.value || '',
        artist: (md.Artist?.value || '').replace(/<[^>]+>/g, '').trim(),
        page: ii?.descriptionurl,
        thumb: ii?.thumburl,
        width: ii?.width,
        height: ii?.height,
      };
    })
    .filter((x) => x.thumb && x.width >= 1000 && ALLOWED.test(x.license));
}

// --list "query" : 후보 제목·라이선스만 출력(다운로드 없음). --pick key "File:..." : 특정 파일을 지정해 받기.
if (process.argv.includes('--list')) {
  const q = process.argv[process.argv.indexOf('--list') + 1];
  const cands = await search(q);
  cands.sort((a, b) => rank(a.license) - rank(b.license));
  for (const c of cands.slice(0, 12)) console.log(`${c.license.padEnd(14)} ${c.width}x${c.height}  ${c.title}`);
  process.exit(0);
}
if (process.argv.includes('--pick')) {
  const i = process.argv.indexOf('--pick');
  const key = process.argv[i + 1], title = process.argv[i + 2];
  const cands = await search(`intitle:"${title.replace(/^File:/, '')}"`);
  const c = cands.find((x) => x.title === title) || cands[0];
  if (!c) { console.error('not found', title); process.exit(1); }
  const res = await fetch(c.thumb, { headers: { 'User-Agent': UA } });
  writeFileSync(join(outDir, `${key}.jpg`), Buffer.from(await res.arrayBuffer()));
  credits[key] = { title: c.title, artist: c.artist, license: c.license, licenseUrl: c.licenseUrl, source: c.page, query: `pick`, size: `${c.width}x${c.height}` };
  writeFileSync(creditsPath, JSON.stringify(credits, null, 2) + '\n');
  console.log(`[bg] ${key} ← ${c.license} | ${c.title}`);
  process.exit(0);
}

for (const [key, qs] of Object.entries(QUERIES)) {
  if (only && !only.includes(key)) continue;
  let picked = null;
  for (const q of qs) {
    try {
      const cands = await search(q);
      // CC0/PD 우선 → 세로 크롭 친화(가로세로비가 너무 넓지 않은 것) 순
      cands.sort((a, b) => rank(a.license) - rank(b.license) || Math.abs(a.width / a.height - 1.4) - Math.abs(b.width / b.height - 1.4));
      if (cands.length) { picked = { ...cands[0], query: q }; break; }
    } catch (e) {
      console.warn(`[bg] ${key} "${q}" 검색 실패: ${e.message}`);
    }
  }
  if (!picked) { console.warn(`[bg] ${key}: 적합한 CC0/CC BY 이미지 없음`); continue; }
  const res = await fetch(picked.thumb, { headers: { 'User-Agent': UA } });
  if (!res.ok) { console.warn(`[bg] ${key}: 다운로드 실패 HTTP ${res.status}`); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(join(outDir, `${key}.jpg`), buf);
  credits[key] = { title: picked.title, artist: picked.artist, license: picked.license, licenseUrl: picked.licenseUrl, source: picked.page, query: picked.query, size: `${picked.width}x${picked.height}` };
  console.log(`[bg] ${key} ← ${picked.license} | ${picked.title}`);
}
writeFileSync(creditsPath, JSON.stringify(credits, null, 2) + '\n');
console.log('[bg] credits →', creditsPath);
