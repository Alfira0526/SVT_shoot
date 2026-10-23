# QA 자동 플레이 하네스 (브라우저 콘솔용)

백그라운드 탭·헤드리스 환경에서 Phaser가 0~1fps로 묶여도, 루프를 멈추고 `game.step()`을 고정 스텝으로 직접 돌리면 물리·타이머·대사 흐름을 수십 배 빠르게 검증할 수 있다. 2026-10-24 전수 점검(13세계 + 무결 완주, 엔들리스·도감·랭킹·설정 스모크)에 쓴 코드.

사용: 개발 서버(`npm run dev`) 페이지를 열고 DevTools 콘솔에 아래를 붙여넣는다. `window.__game`은 `src/main.js`가 노출한다.

```js
// 1) 하네스 설치 — 루프 정지 + 고정 스텝 + 트윈용 Date.now 패치 + 대사 자동 넘김 + 보스 조준 오토파일럿
const g = window.__game;
g.loop.stop();
if (!window.__realNow) { window.__realNow = Date.now; window.__fake = window.__realNow(); Date.now = () => window.__fake; }
let t = performance.now();
window.__errors = []; window.addEventListener('error', e => window.__errors.push(String(e.message)));
const S = (await import('/src/systems/SaveSystem.js')).Save;
S.setDev(true); // 무제한 라이프 (끝나면 S.setDev(false))
const seen = [];
window.__run = (ms, auto = true) => {
  const dt = 1000 / 60;
  for (let i = 0; i < Math.round(ms / dt); i++) {
    t += dt; window.__fake += dt;
    if (g.scene.isActive('Dialogue')) { const d = g.scene.getScene('Dialogue'); if (d.lines && d.index >= 0) { seen.push(d.lines.map(l => (l.speaker || '—') + ': ' + l.text).join(' | ')); d._finish(); } }
    const s = g.scene.getScene('Game');
    if (auto && g.scene.isActive('Game') && s.player?.target) {
      let tx = 240; const boss = s.boss && s.boss.alive ? s.boss : null;
      const es = s.enemies ? s.enemies.getChildren().filter(e => e.active && e.y < 560) : [];
      if (boss) tx = boss.x; else if (es.length) { es.sort((a, b) => b.y - a.y); tx = es[0].x; }
      s.player.target.set(Math.max(20, Math.min(460, tx)), 680);
    }
    g.step(t, dt);
  }
  const s = g.scene.getScene('Game');
  return { scenes: g.scene.getScenes(true).map(x => x.scene.key), phase: s.phase, errors: window.__errors, seen: seen.splice(0) };
};
// 2) 세계 하나 완주 — 다른 활성 씬을 먼저 멈춘 뒤 시작(지도 위에 겹쳐 뜨는 것 방지)
window.__world = (id, maxMs = 160000) => {
  g.scene.getScenes(true).forEach(s => { if (s.scene.key !== 'Boot') s.scene.stop(); });
  window.__run(200);
  g.scene.start('Game', { worldId: id });
  let r = window.__run(12000), all = r.seen.slice(), sim = 12000;
  while (sim < maxMs && !r.scenes.includes('Multiverse')) { r = window.__run(10000); sim += 10000; all = all.concat(r.seen); }
  return { id, sim, done: r.scenes.includes('Multiverse'), errors: r.errors.length, dialogs: all };
};
// 3) 전수: ['w_pollin', ..., 'mugyeol'].map(window.__world)
```

주의
- `done`은 지도 복귀 여부로 판정한다. 시작 전에 다른 씬을 멈추지 않으면 지도 씬이 살아 있어 즉시 `done`이 된다.
- 소스를 수정하면 Vite가 페이지를 새로고침해 하네스가 사라진다. 다시 설치할 것.
- 실기기 체감(터치 지연·프레임)은 이 방법으로 알 수 없다. `docs/release_checklist.md` §3.
