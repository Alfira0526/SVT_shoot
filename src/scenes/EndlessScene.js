import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE, PLAYER, ENDLESS } from '../config/constants.js';
import { Player } from '../entities/Player.js';
import { Enemy, createEnemyGroup } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { createBulletGroup } from '../entities/Bullet.js';
import { Save } from '../systems/SaveSystem.js';
import { applyLoadout } from '../systems/Loadout.js';
import { levelFromExp } from '../config/leveling.js';
import { safeDisplayName } from '../systems/Filter.js';
import { Audio } from '../systems/Audio.js';
import guardians from '../config/guardians.json';

// 엔들리스 거리 마일스톤으로 해금되는 잠든 수호자 (거리 오름차순)
const ENDLESS_UNLOCKS = guardians.roster
  .filter((g) => typeof g.endlessUnlock === 'number')
  .sort((a, b) => a.endlessUnlock - b.endlessUnlock);

// 별조각(성장 재화) — 화면 아래로 흘러내리며 플레이어가 흡수.
class Coin extends Phaser.Physics.Arcade.Sprite {
  spawn(x, y, vy) {
    this.setTexture('coin');
    this.enableBody(true, x, y, true, true);
    this.setActive(true).setVisible(true);
    this.setVelocity(0, vy);
    this._bornX = x;
    this._t = 0;
    return this;
  }
  deactivate() { this.disableBody(true, true); }
  preUpdate(t, d) {
    super.preUpdate(t, d);
    if (!this.active) return;
    // 살짝 좌우로 흔들며 반짝
    this._t += d;
    this.x = this._bornX + Math.sin(this._t * 0.005) * 10;
    this.setScale(0.9 + Math.sin(this._t * 0.01) * 0.12);
    if (this.y > GAME_HEIGHT + 24) this.deactivate();
  }
}

// 엔들리스 모드 (드래곤 플라이트식) — 무한 상승 + 거리(m) 점수 + 별조각 수집 + 구간 보스.
// 스토리 모드와 성장 재화(별조각)를 공유(차기: 업그레이드·13인 수호자 해금).
export class EndlessScene extends Phaser.Scene {
  constructor() {
    super('Endless');
  }

  init() {
    this.nickname = safeDisplayName(this.registry.get('nickname'));
    this.phase = 'flying'; // flying | boss | dead
    this.distance = 0;
    this.gold = 0;
    this.scroll = ENDLESS.scrollBase;
    this._spawnAcc = 0;
    this._coinAcc = 0;
    this._bossCount = 0;
    this._nextBossAt = ENDLESS.bossFirstAt;
    this._midBarkShown = false;
    this._dev = Save.getDev();
  }

  create() {
    this._buildBackground();
    this._buildGroups();

    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 150);
    applyLoadout(this, this.player); // 장착 수호자 → 탄 색·파워·연사

    this._buildHud();
    this._buildCollisions();

    this._banner('엔들리스', '빛을 따라 끝없이 올라가라', 900);
  }

  // ── 패럴랙스 배경 (다층 스크롤 — 체감 퀄 상승) ───────────
  _buildBackground() {
    const g = this.add.graphics().setDepth(-20);
    g.fillGradientStyle(PALETTE.deep, PALETTE.deep, PALETTE.deepMid, PALETTE.deepMid, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 빛 구름 밴드 (느린 층)
    this.clouds = [];
    for (let i = 0; i < 4; i++) {
      const c = this.add
        .ellipse(Phaser.Math.Between(0, GAME_WIDTH), i * 240 - 120, Phaser.Math.Between(220, 360), Phaser.Math.Between(80, 140), i % 2 ? PALETTE.rose : PALETTE.serenity, 0.05)
        .setDepth(-18);
      c.speed = 24 + i * 6;
      this.clouds.push(c);
    }

    // 별 3층 (원경 느림 → 근경 빠름)
    this.layers = [];
    const tiers = [
      { n: 26, speed: 30, scale: 1, alpha: 0.35 },
      { n: 20, speed: 62, scale: 2, alpha: 0.6 },
      { n: 12, speed: 110, scale: 3, alpha: 0.9 },
    ];
    for (const t of tiers) {
      for (let i = 0; i < t.n; i++) {
        const s = this.add
          .image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT), 'star')
          .setDepth(-15)
          .setScale(t.scale)
          .setAlpha(Phaser.Math.FloatBetween(t.alpha * 0.5, t.alpha))
          .setTint(i % 3 === 0 ? PALETTE.rose : PALETTE.serenity);
        s.speed = t.speed;
        this.layers.push(s);
      }
    }
  }

  _buildGroups() {
    this.playerBullets = createBulletGroup(this, 'bullet_player', 220);
    this.enemyBullets = createBulletGroup(this, 'bullet_enemy', 400);
    this.enemies = createEnemyGroup(this, 40);
    this.coins = this.physics.add.group({ classType: Coin, maxSize: 48, runChildUpdate: true });
  }

  _buildHud() {
    // 거리 (상단 중앙)
    this.distText = this.add.text(GAME_WIDTH / 2, 16, '0 m', { fontSize: '26px', color: PALETTE.ink, fontStyle: 'bold' })
      .setOrigin(0.5, 0).setDepth(20);
    this.best = Save.getEndless().bestDistance || 0;
    this.bestText = this.add.text(GAME_WIDTH / 2, 46, `BEST ${this.best} m`, { fontSize: '12px', color: PALETTE.goldHex })
      .setOrigin(0.5, 0).setDepth(20);

    // 별조각 (좌상단)
    this.add.image(20, 24, 'coin').setDepth(20);
    this.goldText = this.add.text(34, 15, '0', { fontSize: '18px', color: PALETTE.goldHex, fontStyle: 'bold' }).setDepth(20);

    // 잔기 (우상단)
    this.livesText = this.add.text(GAME_WIDTH - 12, 14, '', { fontSize: '18px', color: PALETTE.dangerHex })
      .setOrigin(1, 0).setDepth(20);
    this._refreshLives();

    // 일시정지
    this.add.text(GAME_WIDTH - 14, GAME_HEIGHT - 24, '⏸', { fontSize: '20px', color: PALETTE.inkDim })
      .setOrigin(1).setDepth(20).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._togglePause());

    // 보스 HP (숨김)
    this.bossHpBg = this.add.graphics().setDepth(20).setVisible(false);
    this.bossHpBar = this.add.graphics().setDepth(21).setVisible(false);
    this.bossNameText = this.add.text(GAME_WIDTH / 2, 72, '', { fontSize: '12px', color: PALETTE.dangerHex, fontStyle: 'bold' })
      .setOrigin(0.5).setDepth(22).setVisible(false);
  }

  _refreshLives() {
    if (this._dev) { this.livesText.setText('DEV ∞'); return; }
    this.livesText.setText('♥ '.repeat(Math.max(0, this.player?.lives ?? 0)).trim() || '—');
  }

  _buildCollisions() {
    this.physics.add.overlap(this.playerBullets, this.enemies, this._hitEnemy, null, this);
    this.physics.add.overlap(this.enemyBullets, this.player, this._hitPlayer, null, this);
    this.physics.add.overlap(this.enemies, this.player, this._contactPlayer, null, this);
    this.physics.add.overlap(this.coins, this.player, this._collectCoin, null, this);
  }

  // ── 프레임 루프 ─────────────────────────────────────────
  update(time, delta) {
    if (this.paused) return;
    const dt = delta / 1000;
    this._scrollBg(dt);

    if (this.phase === 'dead') return;
    if (this.physics.world.isPaused) return;

    // 비행 중: 거리·난도 램프·스폰
    if (this.phase === 'flying') {
      const ramp = Phaser.Math.Clamp(this.distance / ENDLESS.rampDistance, 0, 1);
      this.scroll = ENDLESS.scrollBase + (ENDLESS.scrollMax - ENDLESS.scrollBase) * ramp;
      this.distance += this.scroll * dt * ENDLESS.distancePerPx;
      this._updateHud();

      const interval = ENDLESS.spawnStartMs - (ENDLESS.spawnStartMs - ENDLESS.spawnMinMs) * ramp;
      this._spawnAcc += delta;
      if (this._spawnAcc >= interval) { this._spawnAcc = 0; this._spawnWave(ramp); }

      this._coinAcc += delta;
      if (this._coinAcc >= ENDLESS.coinRowMs) { this._coinAcc = 0; this._spawnCoinRow(); }

      if (this.distance >= this._nextBossAt) this._startBoss();
    }

    // 플레이어 자동발사
    this.player.update(time, (points) => {
      for (const pt of points) {
        const b = this.playerBullets.get();
        if (b) { b.fire(pt.x, pt.y, pt.vx || 0, -560, 20, 'bullet_player'); b.setTint(this._bulletTint); }
      }
      Audio.sfx('shoot');
    });

    if (this.phase === 'boss' && this.boss && this.boss.active) {
      this.boss.update(time);
      this._drawBossHp();
      this._checkMidBark();
    }
  }

  _scrollBg(dt) {
    for (const s of this.layers) {
      s.y += s.speed * dt;
      if (s.y > GAME_HEIGHT + 4) { s.y = -4; s.x = Phaser.Math.Between(0, GAME_WIDTH); }
    }
    for (const c of this.clouds) {
      c.y += c.speed * dt;
      if (c.y > GAME_HEIGHT + 60) { c.y = -80; c.x = Phaser.Math.Between(0, GAME_WIDTH); }
    }
  }

  _updateHud() {
    this.distText.setText(`${Math.floor(this.distance)} m`);
    this.goldText.setText(String(this.gold));
  }

  // ── 스폰 ────────────────────────────────────────────────
  _spawnWave(ramp) {
    const types = ['macro', 'spinner', 'popup'];
    const count = 1 + (Math.random() < 0.35 + ramp * 0.3 ? 1 : 0) + (Math.random() < ramp * 0.4 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const x = Phaser.Math.Between(40, GAME_WIDTH - 40);
      const e = this.enemies.get();
      if (e) e.spawn(type, x, -20);
    }
  }

  _spawnCoinRow() {
    const n = Phaser.Math.Between(3, 5);
    const startX = Phaser.Math.Between(60, GAME_WIDTH - 60 - n * 26);
    for (let i = 0; i < n; i++) {
      const c = this.coins.get();
      if (c) c.spawn(startX + i * 26, -20 - i * 22, 150);
    }
  }

  _dropCoin(x, y) {
    const c = this.coins.get();
    if (c) c.spawn(x, y, 130);
  }

  // ── 구간 보스 ───────────────────────────────────────────
  _startBoss() {
    this.phase = 'boss';
    this._midBarkShown = false;
    // 잔여 잡몹 정리 (보스 무대 정돈)
    this.enemies.children.each((e) => { if (e.active) e.deactivate(); });

    const cfg = this._bossConfig(this._bossCount);
    this.boss = new Boss(this, cfg);
    this._bossCollider = this.physics.add.overlap(this.playerBullets, this.boss, this._hitBoss, null, this);
    this.bossNameText.setText(cfg.name).setVisible(true);
    this.bossHpBg.setVisible(true);
    this.bossHpBar.setVisible(true);
    this._banner('구간 보스 등장', cfg.name, 700);
    this.boss.enter();
  }

  _bossConfig(n) {
    const portraits = ['noise', 'server', 'scalper', 'monopolist'];
    const names = { noise: '노이즈', server: '티켓팅 서버', scalper: '암표 총책', monopolist: '독점자' };
    const p = portraits[n % portraits.length];
    const hp = 1000 + n * 700;
    return {
      name: names[p],
      portrait: p,
      hp,
      midBark: { at: 0.4, speaker: names[p], text: '이 정도 빛으론…… 어림없어.' },
      phases: [
        { from: 1.0, to: 0.55, pattern: 'spread', count: 7, speed: 150, intervalMs: 900, summon: n % 2 ? 'spinner' : undefined },
        { from: 0.55, to: 0.25, pattern: 'fan', count: 10, speed: 160, intervalMs: 820 },
        { from: 0.25, to: 0.0, pattern: 'rage', count: 16 + n * 2, speed: 180, intervalMs: 600 },
      ],
    };
  }

  _bossDefeated() {
    this.enemyBullets.children.each((b) => { if (b.active) b.deactivate(); });
    Audio.sfx('explode');
    const reward = 20 + this._bossCount * 8;
    this.boss.defeatSequence(() => {
      this.bossHpBg.setVisible(false);
      this.bossHpBar.setVisible(false);
      this.bossNameText.setVisible(false);
      // 보상: 별조각 다발 + 응원봉 파워업(런 내 성장)
      for (let i = 0; i < 8; i++) this._dropCoin(GAME_WIDTH / 2 + Phaser.Math.Between(-60, 60), 120);
      this.gold += reward;
      if (this.player.power < PLAYER.maxPower) this.player.powerUp();
      this._floatText(GAME_WIDTH / 2, 150, `보스 격파! 별조각 +${reward}`);
      this._banner('돌파', 'BREAKTHROUGH', 700);
      this.cameras.main.flash(280, 255, 245, 200);
      // 다음 보스 거리(점증) → 비행 재개
      this._bossCount += 1;
      this._nextBossAt = Math.floor(this.distance) + ENDLESS.bossGap + this._bossCount * 120;
      // 격파 보스 정리 — 스프라이트·물리바디·overlap 콜라이더 누수 방지 (런 내 누적 차단)
      if (this._bossCollider) { this.physics.world.removeCollider(this._bossCollider); this._bossCollider = null; }
      this.boss.destroy();
      this.boss = null;
      this.phase = 'flying';
      this._updateHud();
    });
  }

  _checkMidBark() {
    const mb = this.boss.cfg?.midBark;
    if (!mb || this._midBarkShown) return;
    if (this.boss.hpRatio() <= (mb.at ?? 0.5)) {
      this._midBarkShown = true;
      this._bark(mb.speaker, mb.text);
    }
  }

  _drawBossHp() {
    const r = this.boss.hpRatio();
    const x = 40, y = 88, w = GAME_WIDTH - 80, h = 9;
    this.bossHpBg.clear();
    this.bossHpBg.fillStyle(0x000000, 0.5);
    this.bossHpBg.fillRoundedRect(x, y, w, h, 4);
    this.bossHpBar.clear();
    this.bossHpBar.fillStyle(r > 0.3 ? PALETTE.rose : PALETTE.danger, 1);
    this.bossHpBar.fillRoundedRect(x, y, Math.max(2, w * r), h, 4);
  }

  // ── 충돌 콜백 ───────────────────────────────────────────
  _hitEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active) return;
    bullet.deactivate();
    if (enemy.takeDamage(20)) {
      this.spawnExplosion(enemy.x, enemy.y, 0.8);
      Audio.sfx('hitEnemy');
      const ex = enemy.x, ey = enemy.y;
      enemy.deactivate();
      if (Math.random() < ENDLESS.killCoinChance) this._dropCoin(ex, ey);
    }
  }

  _hitBoss(a, b) {
    const boss = a === this.boss ? a : b;
    const bullet = a === this.boss ? b : a;
    if (!bullet.active || !boss.alive) return;
    bullet.deactivate();
    if (boss.takeDamage(20)) this._bossDefeated();
  }

  _hitPlayer(player, bullet) {
    if (!bullet.active) return;
    bullet.deactivate();
    this._applyHit();
  }

  _contactPlayer(player, enemy) {
    if (!enemy.active) return;
    this._applyHit();
  }

  _applyHit() {
    const now = this.time.now;
    if (this._dev) {
      if (!this.player.isInvincible(now)) {
        this.player.invincibleUntil = now + PLAYER.invincibleMs;
        this.spawnExplosion(this.player.x, this.player.y, 0.6);
        Audio.sfx('playerHit');
        this.cameras.main.flash(70, 156, 193, 229);
      }
      return;
    }
    if (this.player.hit(now)) {
      this.spawnExplosion(this.player.x, this.player.y, 0.9);
      Audio.sfx('playerHit');
      this._refreshLives();
      this.cameras.main.shake(180, 0.008);
      if (this.player.lives <= 0) this._die();
    } else if (this.player.hasShield(now)) {
      this.cameras.main.flash(80, 156, 193, 229);
    }
  }

  _collectCoin(player, coin) {
    if (!coin.active) return;
    coin.deactivate();
    this.gold += 1;
    Audio.sfx('life');
    this._updateHud();
  }

  // ── 씬 인터페이스 (Enemy/Boss가 호출) ────────────────────
  summonEnemy(type) {
    const e = this.enemies.get();
    if (e) e.spawn(type, Phaser.Math.Between(40, GAME_WIDTH - 40), -20);
  }

  enemyFireAt(x, y, vx, vy) {
    const b = this.enemyBullets.get();
    if (b) b.fire(x, y, vx, vy, 1, 'bullet_enemy');
  }

  spawnExplosion(x, y, scale = 1) {
    const p = this.add.particles(x, y, 'spark', {
      speed: { min: 40, max: 180 * scale },
      scale: { start: 1.2 * scale, end: 0 },
      lifespan: 420, quantity: 12,
      tint: [PALETTE.light, PALETTE.rose, PALETTE.gold],
      blendMode: 'ADD',
    });
    p.explode(14);
    this.time.delayedCall(500, () => p.destroy());
  }

  // ── 사망 → 런 요약 → 재시작 루프 ─────────────────────────
  _die() {
    if (this.phase === 'dead') return;
    this.phase = 'dead';
    this.physics.world.pause();
    Audio.sfx('explode');
    this.cameras.main.shake(360, 0.016);

    const rec = Save.recordEndless({ distance: this.distance, gold: this.gold });
    const dist = Math.floor(this.distance);
    const isBest = dist >= rec.bestDistance && dist > 0;

    // 거리 마일스톤 수호자 해금 — 최고 거리로 임계 넘긴 잠든 수호자 각성
    const unlocked = [];
    for (const g of ENDLESS_UNLOCKS) {
      if (rec.bestDistance >= g.endlessUnlock && !Save.isGuardianAwake(g.id)) {
        Save.awakenGuardian(g.id);
        unlocked.push(g);
      }
    }

    // 장착 수호자 육성 — 거리 비례 EXP
    const lo = this._loadout;
    const expGain = Phaser.Math.Clamp(Math.floor(dist / 12), 5, 400);
    let expLine = '';
    if (lo) {
      const before = levelFromExp(Save.getGuardianExp(lo.id)).level;
      Save.addGuardianExp(lo.id, expGain);
      const after = levelFromExp(Save.getGuardianExp(lo.id)).level;
      expLine = `${lo.guardian?.name || '수호자'}  +${expGain} EXP` + (after > before ? `  ·  Lv.${after}!` : '');
    }

    this.time.delayedCall(700, () => {
      const c = this.add.container(0, 0).setDepth(60);
      c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72).setOrigin(0).setInteractive());
      c.add(this.add.text(GAME_WIDTH / 2, 240, isBest ? '신기록!' : '비행 종료', {
        fontSize: '34px', fontStyle: 'bold', color: isBest ? PALETTE.goldHex : PALETTE.ink,
      }).setOrigin(0.5));
      c.add(this.add.text(GAME_WIDTH / 2, 300, `${dist} m`, { fontSize: '46px', fontStyle: 'bold', color: PALETTE.roseHex }).setOrigin(0.5));
      c.add(this.add.text(GAME_WIDTH / 2, 352, `BEST ${rec.bestDistance} m`, { fontSize: '15px', color: PALETTE.inkDim }).setOrigin(0.5));
      c.add(this.add.image(GAME_WIDTH / 2 - 40, 398, 'coin').setScale(1.2));
      c.add(this.add.text(GAME_WIDTH / 2 - 20, 388, `+${this.gold}  (누적 ${rec.totalGold})`, { fontSize: '16px', color: PALETTE.goldHex, fontStyle: 'bold' }).setOrigin(0, 0));
      if (expLine) c.add(this.add.text(GAME_WIDTH / 2, 428, expLine, { fontSize: '14px', color: PALETTE.serenityHex, fontStyle: 'bold' }).setOrigin(0.5));
      if (unlocked.length) {
        c.add(this.add.text(GAME_WIDTH / 2, 450, `✦ 새 수호자 해금: ${unlocked.map((g) => g.name).join(', ')}`, {
          fontSize: '15px', color: PALETTE.goldHex, fontStyle: 'bold', align: 'center', wordWrap: { width: GAME_WIDTH - 60 },
        }).setOrigin(0.5));
      }
      c.add(this._btn(GAME_WIDTH / 2, 486, '다시 도전', PALETTE.rose, '#2a1a2a', () => { Audio.sfx('ui'); this.scene.restart(); }));
      c.add(this._btn(GAME_WIDTH / 2, 550, '타이틀로', PALETTE.panel, PALETTE.ink, () => { Audio.sfx('ui'); this.scene.start('Title'); }));
    });
  }

  // ── 공용 연출 헬퍼 ──────────────────────────────────────
  _banner(title, subtitle, hold = 900) {
    const c = this.add.container(GAME_WIDTH / 2, 200).setDepth(30);
    c.add(this.add.text(0, -10, title, { fontSize: '28px', color: PALETTE.ink, fontStyle: 'bold' }).setOrigin(0.5));
    c.add(this.add.text(0, 22, subtitle, { fontSize: '13px', color: PALETTE.serenityHex }).setOrigin(0.5));
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 300, yoyo: true, hold, onComplete: () => c.destroy() });
  }

  _bark(speaker, text) {
    const c = this.add.container(GAME_WIDTH / 2, 200).setDepth(24);
    const t = this.add.text(0, 0, text, {
      fontSize: '15px', color: PALETTE.ink, align: 'center',
      backgroundColor: 'rgba(22,19,39,0.88)', padding: { x: 12, y: 8 },
      wordWrap: { width: GAME_WIDTH - 90 },
    }).setOrigin(0.5);
    c.add(t);
    if (speaker) c.add(this.add.text(0, -t.height / 2 - 12, speaker, { fontSize: '12px', color: PALETTE.dangerHex, fontStyle: 'bold' }).setOrigin(0.5));
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 200, yoyo: true, hold: 2200, onComplete: () => c.destroy() });
    Audio.sfx('ui');
  }

  _floatText(x, y, msg) {
    const t = this.add.text(x, y, msg, { fontSize: '16px', color: PALETTE.goldHex, fontStyle: 'bold' })
      .setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: t, y: y - 44, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  _btn(x, y, label, fill, ink, cb) {
    const cont = this.add.container(x, y);
    const w = 200, h = 52;
    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    if (fill === PALETTE.panel) { g.lineStyle(2, PALETTE.serenity, 0.9); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14); }
    const t = this.add.text(0, 0, label, { fontSize: '19px', color: ink, fontStyle: 'bold' }).setOrigin(0.5);
    const z = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true }).on('pointerdown', cb);
    cont.add([g, t, z]);
    return cont;
  }

  _togglePause() {
    if (this.phase === 'dead') return;
    if (this.paused) {
      this.paused = false;
      this._pauseMenu?.destroy();
      this._pauseMenu = null;
      this.physics.world.resume();
      return;
    }
    this.paused = true;
    this.physics.world.pause();
    Audio.sfx('ui');
    const c = this.add.container(0, 0).setDepth(50);
    c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.68).setOrigin(0).setInteractive());
    c.add(this.add.text(GAME_WIDTH / 2, 280, '일시정지', { fontSize: '30px', fontStyle: 'bold', color: PALETTE.ink }).setOrigin(0.5));
    c.add(this._btn(GAME_WIDTH / 2, 360, '계속하기', PALETTE.rose, '#2a1a2a', () => this._togglePause()));
    c.add(this._btn(GAME_WIDTH / 2, 424, '타이틀로', PALETTE.panel, PALETTE.ink, () => { Audio.sfx('ui'); this.scene.start('Title'); }));
    this._pauseMenu = c;
  }
}
