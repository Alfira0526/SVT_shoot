// QA 스모크 테스트 — 헤드리스 브라우저로 전체 플로우/전투/랭킹/저장을 자동 점검.
//   사용법: npm run preview 로 서버 띄운 뒤  PW_CHROME=<chrome경로> URL=<주소> node smoke.mjs
//   (PW_CHROME 미지정 시 playwright-core 가 내려받은 크로미움을 자동 사용)
import { chromium } from 'playwright-core';

const EXEC = process.env.PW_CHROME || chromium.executablePath();
const URL = process.env.URL || 'http://localhost:4173/';

const errors = [];
const browser = await chromium.launch({
  executablePath: EXEC,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 480, height: 800 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

const scenes = () => page.evaluate(() => window.__game?.scene.getScenes(true).map((s) => s.scene.key) ?? null);
const gstate = () => page.evaluate(() => {
  const g = window.__game.scene.getScene('Game');
  const dlg = window.__game.scene.isActive('Dialogue');
  return g ? {
    phase: g.phase, score: g.score?.score, lives: g.player?.lives, dlg,
    pBullets: g.playerBullets?.countActive(true) ?? 0,
    enemies: g.enemies?.countActive(true) ?? 0,
  } : null;
});

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
console.log('load:', await scenes());

await page.evaluate(() => { const el = document.getElementById('nick'); if (el) el.value = '스모크'; });
await page.mouse.click(240, 580);
await page.waitForTimeout(1200);

// Dialogue가 열려 있으면 계속 탭해서 전투(fighting)까지 진입
let reachedFighting = false;
for (let i = 0; i < 60; i++) {
  const g = await gstate();
  if (g && g.phase === 'fighting') { reachedFighting = true; break; }
  await page.mouse.click(240, 320);
  await page.waitForTimeout(300);
}
console.log('reached fighting:', reachedFighting, await gstate());

// 전투: 드래그 이동하며 자동발사·격파로 점수 증가 확인
await page.mouse.move(240, 640); await page.mouse.down();
const before = (await gstate())?.score ?? 0;
let sawBullets = false, sawEnemies = false;
for (let i = 0; i < 20; i++) {
  await page.mouse.move(120 + (i % 6) * 40, 560 + (i % 3) * 30, { steps: 3 });
  const g = await gstate();
  if (g?.pBullets > 0) sawBullets = true;
  if (g?.enemies > 0) sawEnemies = true;
  await page.waitForTimeout(250);
}
await page.mouse.up();
const after = (await gstate())?.score ?? 0;
console.log(`combat: bullets=${sawBullets} enemies=${sawEnemies} scoreBefore=${before} scoreAfter=${after}`);

// 랭킹 씬 직접 검증
await page.evaluate(() => {
  window.__game.scene.start('Ranking', {
    score: 34210, gameover: false, nickname: '스모크', rawNickname: '스모크',
    maxAllowed: 9999999, noMiss: true, playMs: 90000,
  });
});
await page.waitForTimeout(1500);
console.log('ranking:', await scenes());
const storage = await page.evaluate(() => ({
  nickname: JSON.parse(localStorage.getItem('fs_nickname') || 'null'),
  ranking: JSON.parse(localStorage.getItem('fs_ranking_stage') || '[]'),
}));
console.log('localStorage:', JSON.stringify(storage));

const assert = (c, m) => { if (!c) errors.push(`[assert] ${m}`); };
assert(reachedFighting, '전투 페이즈 진입 실패');
assert(sawBullets, '플레이어 자동발사 탄 미확인');
assert(sawEnemies, '잡몹 스폰 미확인');
assert(storage.nickname === '스모크', 'fs_nickname 저장 안됨');
assert(storage.ranking.some((r) => r.score === 34210 && r.play_ms === 90000), '랭킹(play_ms) 저장 안됨');

console.log(`\n=== ERRORS (${errors.length}) ===`);
errors.forEach((e) => console.log(e));
await browser.close();
process.exit(errors.length ? 1 : 0);
