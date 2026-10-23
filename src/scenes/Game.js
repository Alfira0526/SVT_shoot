import Phaser from 'phaser';
import { COLORS, CSS, DEPTH, FALLBACK_NICKNAME, GAME_H, GAME_W, PLAYER, SCORE } from '../config/constants.js';
import { DIALOGUES, STAGES } from '../config/index.js';
import Player from '../entities/Player.js';
import Enemy, { ENEMY_DEFS } from '../entities/Enemy.js';
import Boss from '../entities/Boss.js';
import Bullet from '../entities/Bullet.js';
import Item, { ITEM_DEFS } from '../entities/Item.js';
import WaveSpawner from '../systems/WaveSpawner.js';
import { Audio } from '../systems/Audio.js';
import { Storage } from '../systems/Storage.js';
import { prepareLines } from '../systems/Dialogue.js';
import { drawVerticalGradient } from '../systems/Textures.js';
import { formatScore, makeButton, textStyle } from '../systems/ui.js';

export function newRun() {
  return {
    score: 0,
    lives: PLAYER.lives,
    hits: 0,
    startedAt: Date.now(),
    stagesCleared: [],
    power: PLAYER.basePower,
    stats: { enemies: 0, items: 0 },
  };
}

// 충돌 콜백 인자 순서가 뒤집히는 경우를 대비해 타입으로 분리
function pair(a, b, Cls) {
  return a instanceof Cls ? [a, b] : [b, a];
}

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.stageId = data?.stageId || 'w1';
    this.run = data?.run || newRun();
    this.stage = STAGES[this.stageId];
    this.dialogue = DIALOGUES[this.stage.dialogue] || {};
    this.nickname = Storage.getNickname() || FALLBACK_NICKNAME;
    this.state = 'intro';
    this.boss = null;
    this.summoned = 0;
    this.confetti = null;
  }

  create() {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.createBackdrop();
    this.createGroups();
    this.player = new Player(this, GAME_W / 2, GAME_H - 150);
    this.player.power = this.run.power;
    this.createHud();
    this.createFx();
    this.setupInput();
    this.setupCollisions();
    this.spawner = new WaveSpawner(this, this.stage);

    this.events.on('enemy-removed', this.onEnemyRemoved, this);
    this.events.on('waves-complete', this.onWavesComplete, this);
    this.events.on('wave-start', this.onWaveStart, this);
    this.events.on('boss-damaged', this.updateBossBar, this);
    this.events.on('boss-half', this.onBossHalf, this);
    this.events.on('boss-phase', this.onBossPhase, this);
    this.events.on('boss-defeated', this.onBossDefeated, this);
    this.events.on('resume', () => this.player?.endDrag());
    this.events.once('shutdown', this.cleanup, this);

    // 탭 전환·전화 수신 등으로 화면이 가려지면 자동 일시정지 (복귀 즉사 방지)
    this.onVisibility = () => {
      if (document.hidden) this.pauseGame();
    };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.game.events.on('blur', this.onVisibility);

    Audio.playBgm(this.stage.bgm || 'w1');
    this.startIntro();
  }

  // ---------- 생성 ----------
  createBackdrop() {
    const g = this.add.graphics().setDepth(DEPTH.backdrop);
    const [c1, c2] = this.stage.backdrop || [CSS.deep, CSS.panel];
    drawVerticalGradient(g, 0, 0, GAME_W, GAME_H, c1, c2);
    this.starsFar = this.add.tileSprite(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 'stars').setDepth(DEPTH.stars).setAlpha(0.5);
    this.starsNear = this.add.tileSprite(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 'stars').setDepth(DEPTH.stars).setScale(1.6).setAlpha(0.35);
  }

  createGroups() {
    this.playerBullets = this.physics.add.group({ classType: Bullet, maxSize: 90 });
    this.enemyBullets = this.physics.add.group({ classType: Bullet, maxSize: 420 });
    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: 60 });
    this.items = this.physics.add.group({ classType: Item, maxSize: 12 });
  }

  createHud() {
    this.scoreText = this.add.text(16, 12, '', textStyle(20, CSS.cream, { fontStyle: 'bold', stroke: CSS.ink, strokeThickness: 4 })).setDepth(DEPTH.hud);
    this.add.text(GAME_W / 2, 14, this.stage.name, textStyle(13, CSS.serenity)).setOrigin(0.5, 0).setDepth(DEPTH.hud);
    this.lifeIcons = [];
    for (let i = 0; i < 5; i++) {
      const icon = this.add.image(GAME_W - 24 - i * 26, 24, 'player').setScale(0.75).setDepth(DEPTH.hud);
      this.lifeIcons.push(icon);
    }
    this.pauseBtn = makeButton(this, GAME_W - 30, 66, '❚❚', () => this.pauseGame(), {
      w: 44,
      h: 32,
      fontSize: 13,
      color: COLORS.panel,
      textColor: CSS.cream,
      radius: 10,
    }).setDepth(DEPTH.hud);

    // 보스 체력바 = 대기열 숫자 (§3.4)
    this.bossBar = this.add.container(0, 0).setDepth(DEPTH.hud).setVisible(false);
    this.bossLabel = this.add.text(GAME_W / 2, 98, '', textStyle(15, CSS.cream, { fontStyle: 'bold', stroke: CSS.ink, strokeThickness: 4 })).setOrigin(0.5);
    const barBg = this.add.graphics();
    barBg.fillStyle(COLORS.ink, 0.8);
    barBg.fillRoundedRect(40, 112, GAME_W - 80, 12, 6);
    this.bossFill = this.add.graphics();
    this.bossBar.add([barBg, this.bossFill, this.bossLabel]);

    this.updateScore();
    this.updateLives();
  }

  createFx() {
    this.explosionFx = this.add
      .particles(0, 0, 'particle', {
        speed: { min: 60, max: 240 },
        lifespan: { min: 250, max: 520 },
        scale: { start: 1.1, end: 0 },
        alpha: { start: 1, end: 0 },
        quantity: 12,
        emitting: false,
        blendMode: 'ADD',
      })
      .setDepth(DEPTH.fx);
  }

  setupInput() {
    this.input.on('pointerdown', (p) => {
      if (!this.player?.alive || this.state === 'clear' || this.state === 'gameover') return;
      this.player.beginDrag(p);
      this.hideTutorial();
    });
    this.input.on('pointermove', (p) => {
      if (p.isDown && this.player?.target) this.player.updateDrag(p);
    });
    this.input.on('pointerup', () => this.player?.endDrag());
    this.input.keyboard?.on('keydown-ESC', () => this.pauseGame());
    this.input.keyboard?.on('keydown-P', () => this.pauseGame());
  }

  setupCollisions() {
    this.physics.add.overlap(this.playerBullets, this.enemies, (a, b) => {
      const [bullet, enemy] = pair(a, b, Bullet);
      if (!bullet.active || !enemy.active) return;
      bullet.disableBody(true, true);
      const killed = enemy.takeDamage(bullet.damage, this.time.now);
      if (!killed) {
        Audio.sfx('hit');
        this.spawnExplosion(enemy.x, enemy.y, 0xffffff, 2);
      }
    });

    this.physics.add.overlap(this.player, this.enemyBullets, (a, b) => {
      const [, bullet] = pair(a, b, Player);
      if (!bullet.active) return;
      if (this.time.now < this.player.shieldUntil) {
        bullet.disableBody(true, true);
        this.spawnExplosion(bullet.x, bullet.y, COLORS.serenity, 3);
        return;
      }
      this.onPlayerHit();
    });

    this.physics.add.overlap(this.player, this.enemies, (a, b) => {
      const [, enemy] = pair(a, b, Player);
      if (!enemy.active) return;
      if (this.time.now < this.player.shieldUntil) {
        enemy.takeDamage(99, this.time.now);
        return;
      }
      this.onPlayerHit();
    });

    this.physics.add.overlap(this.player, this.items, (a, b) => {
      const [, item] = pair(a, b, Player);
      if (!item.active) return;
      this.collectItem(item);
    });
  }

  // ---------- 흐름 ----------
  startIntro() {
    this.state = 'intro';
    this.player.canShoot = false;
    this.showBanner(this.stage.name, this.stage.caption, CSS.cream, 1600);
    this.time.delayedCall(1900, () => {
      this.showDialogue(this.dialogue.intro, () => this.startWaves());
    });
  }

  startWaves() {
    this.state = 'waves';
    this.player.canShoot = true;
    this.showTutorial();
    this.spawner.start();
  }

  onWaveStart(n, total) {
    this.showToast(`WAVE ${n} / ${total}`, CSS.serenity);
  }

  onWavesComplete() {
    if (this.state !== 'waves') return;
    const mp = this.stage.midPattern;
    if (mp) this.runMidPattern(mp);
    else this.startBoss();
  }

  // 중간 패턴: 대기열 폭주 — 999,999 숫자 탄막 (§3.4)
  runMidPattern(mp) {
    this.state = 'mid';
    Audio.sfx('warning');
    this.showBanner(mp.label || '대기열 폭주!', '', CSS.danger, 1400);
    this.time.delayedCall(mp.delay ?? 800, () => {
      const ticks = Math.floor(mp.duration / mp.interval);
      this.midTimer = this.time.addEvent({
        delay: mp.interval,
        repeat: ticks - 1,
        callback: () => {
          for (let i = 0; i < (mp.perTick || 3); i++) {
            const b = this.enemyBullets.get(0, 0, 'bullet_num');
            if (!b) continue;
            const x = Phaser.Math.Between(40, GAME_W - 40);
            const vy = Phaser.Math.Between(mp.speed[0], mp.speed[1]);
            b.setDepth(DEPTH.enemyBullets);
            b.fire(x, -20, Phaser.Math.Between(-30, 30), vy, 'bullet_num', { bodyW: 54, bodyH: 12, spin: Phaser.Math.Between(-30, 30) });
          }
        },
      });
      this.time.delayedCall(mp.duration + 1800, () => this.startBoss());
    });
  }

  startBoss() {
    if (this.state === 'gameover') return;
    this.state = 'boss-intro';
    this.spawner.stop();
    Audio.sfx('warning');
    this.showBanner('WARNING', this.stage.boss.name + ' 접근', CSS.danger, 1500);
    this.cameras.main.shake(400, 0.006);

    this.boss = new Boss(this, this.stage.boss);
    this.physics.add.overlap(this.playerBullets, this.boss, (a, b) => {
      const [bullet, boss] = pair(a, b, Bullet);
      if (!bullet.active || !boss.fighting) return;
      bullet.disableBody(true, true);
      boss.takeDamage(bullet.damage, this.time.now);
      this.addScore(SCORE.bossTick);
      Audio.sfx('bossHit');
    });
    this.physics.add.overlap(this.player, this.boss, () => {
      if (this.boss?.fighting && this.time.now >= this.player.shieldUntil) this.onPlayerHit();
    });

    this.boss.enter(() => {
      this.bossBar.setVisible(true);
      this.updateBossBar(this.boss.hp, this.boss.maxHp);
      this.showDialogue(this.dialogue.boss, () => {
        if (this.state === 'gameover') return;
        this.state = 'boss';
        Audio.playBgm(this.stage.bossBgm || this.stage.bgm || 'boss');
        this.boss.activate();
      });
    });
  }

  onBossHalf() {
    if (this.dialogue.bossMid?.length && this.state === 'boss') {
      this.showDialogue(this.dialogue.bossMid, () => {});
    }
  }

  // 페이즈 전환: 화면의 적 탄을 빛 입자로 소거 (장르 관례 — 전환 직후 즉사 방지 + 쾌감)
  onBossPhase(i, phase) {
    if (i === 0) return;
    this.showToast(`PHASE ${i + 1}`, CSS.coral);
    this.cancelEnemyBullets(true);
  }

  cancelEnemyBullets(withFx = false) {
    this.enemyBullets.getChildren().forEach((b) => {
      if (!b.active) return;
      if (withFx) this.spawnExplosion(b.x, b.y, COLORS.lemon, 2);
      b.disableBody(true, true);
    });
  }

  updateBossBar(hp, max) {
    const ratio = Phaser.Math.Clamp(hp / max, 0, 1);
    this.bossFill.clear();
    this.bossFill.fillStyle(ratio > 0.3 ? COLORS.danger : COLORS.lemon, 1);
    this.bossFill.fillRoundedRect(40, 112, Math.max(6, (GAME_W - 80) * ratio), 12, 6);
    const label = this.stage.boss.hpLabel || 'HP';
    const value = this.stage.boss.type === 'ticket_server'
      ? Math.round(999999 * ratio).toLocaleString()
      : `${Math.round(ratio * 100)}%`;
    this.bossLabel.setText(`${this.stage.boss.name} · ${label} ${value}`);
  }

  showBossLabel(text) {
    if (!this.boss) return;
    const t = this.add.text(this.boss.x, this.boss.y + 70, text, textStyle(22, CSS.lemon, { fontStyle: 'bold', stroke: CSS.ink, strokeThickness: 5 })).setOrigin(0.5).setDepth(DEPTH.banner);
    this.tweens.add({ targets: t, y: t.y + 30, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  onBossDefeated(boss) {
    this.state = 'clear';
    this.spawner.stop();
    this.midTimer?.remove(false);
    this.enemyBullets.getChildren().forEach((b) => b.active && b.disableBody(true, true));
    this.enemies.getChildren().forEach((e) => e.active && e.disableBody(true, true));
    this.player.canShoot = false;
    this.player.endDrag();
    this.bossBar.setVisible(false);
    this.addScore(SCORE.bossKill);
    Audio.stopBgm();
    Audio.sfx('bossExplode');
    this.cameras.main.shake(700, 0.015);

    for (let i = 0; i < 7; i++) {
      this.time.delayedCall(i * 140, () => {
        this.spawnExplosion(boss.x + Phaser.Math.Between(-40, 40), boss.y + Phaser.Math.Between(-40, 40), [COLORS.lemon, COLORS.coral, COLORS.white][i % 3], 16);
      });
    }
    this.tweens.add({ targets: boss, alpha: 0, scale: 1.4, duration: 1000, delay: 300, onComplete: () => boss.destroy() });

    this.time.delayedCall(1200, () => {
      const [main, sub] = this.stage.clearBanner || ['CLEAR', ''];
      this.showBanner(main, sub, CSS.lemon, 2400);
      Audio.sfx('clear');
      this.confetti = this.add
        .particles(0, -10, 'confetti', {
          x: { min: 0, max: GAME_W },
          speedY: { min: 110, max: 260 },
          speedX: { min: -40, max: 40 },
          lifespan: 3600,
          rotate: { min: 0, max: 360 },
          tint: [COLORS.rose, COLORS.serenity, COLORS.lemon, COLORS.mint, COLORS.grape],
          quantity: 2,
          frequency: 40,
          gravityY: 50,
        })
        .setDepth(DEPTH.fx);
    });

    this.time.delayedCall(2800, () => {
      this.showDialogue(this.dialogue.defeat, () => {
        this.showDialogue(this.dialogue.outro, () => this.finishStage());
      });
    });
  }

  finishStage() {
    this.run.stagesCleared.push(this.stageId);
    this.run.power = this.player.power;
    Storage.markStageCleared(this.stageId);
    this.confetti?.stop();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.stage.next) this.scene.start('Game', { stageId: this.stage.next, run: this.run });
      else this.scene.start('Result', { run: this.run, cleared: true });
    });
  }

  onPlayerHit() {
    if (!this.player.takeHit(this.time.now)) return;
    this.run.hits += 1;
    this.run.lives -= 1;
    Audio.sfx('playerHit');
    this.cameras.main.shake(300, 0.02);
    this.spawnExplosion(this.player.x, this.player.y, COLORS.rose, 20);
    // 피격 직후 화면의 적 탄 소거 (재개 시 즉사 방지)
    this.enemyBullets.getChildren().forEach((b) => b.active && b.disableBody(true, true));
    this.updateLives();
    if (this.run.lives <= 0) this.gameOver();
    else this.showToast('빛이 흔들린다…', CSS.danger);
  }

  gameOver() {
    this.state = 'gameover';
    this.player.die();
    this.spawner.stop();
    this.midTimer?.remove(false);
    if (this.boss) this.boss.fighting = false;
    Audio.stopBgm();
    Audio.sfx('gameover');
    this.showBanner('GAME OVER', '빛이 흐려졌다', CSS.danger, 2600);
    this.time.delayedCall(2600, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Result', { run: this.run, cleared: false }));
    });
  }

  // ---------- 적·아이템 ----------
  spawnEnemy(type, x, y, opts = {}) {
    if (this.state === 'gameover' || this.state === 'clear') return null;
    const def = ENEMY_DEFS[type];
    const e = this.enemies.get(x, y, def?.texture);
    if (!e) return null;
    e.spawn(type, x, y, opts);
    return e;
  }

  summonFromBoss(type, count, x, y) {
    const cap = this.stage.boss.maxSummons ?? 0;
    for (let i = 0; i < count; i++) {
      if (this.summoned >= cap) return;
      this.summoned += 1;
      const ox = (i - (count - 1) / 2) * 70;
      this.spawnEnemy(type, Phaser.Math.Clamp(x + ox, 30, GAME_W - 30), y);
    }
  }

  onEnemyRemoved(enemy, killed) {
    if (!killed) return;
    this.addScore(SCORE.enemy);
    this.run.stats.enemies += 1;
    Audio.sfx('explode');
    this.spawnExplosion(enemy.x, enemy.y, COLORS.coral, 10);
    let drop = enemy.drop;
    if (!drop) {
      const r = Math.random();
      if (r < 0.04) drop = 'lightstick';
      else if (r < 0.055) drop = 'seed';
      else if (r < 0.095) drop = 'shield';
    }
    if (drop) this.spawnItem(drop, enemy.x, enemy.y);
  }

  spawnItem(kind, x, y) {
    const item = this.items.get(x, y, ITEM_DEFS[kind]?.texture);
    if (!item) return;
    item.drop(kind, x, y);
  }

  collectItem(item) {
    const kind = item.kind;
    item.disableBody(true, true);
    this.run.stats.items += 1;
    switch (kind) {
      case 'lightstick':
        this.player.addPower();
        Audio.sfx('item');
        break;
      case 'seed':
        this.run.lives = Math.min(5, this.run.lives + 1);
        this.updateLives();
        Audio.sfx('life');
        break;
      case 'shield':
        this.player.grantShield(this.time.now);
        Audio.sfx('shield');
        break;
      default:
        break;
    }
    this.floatText(ITEM_DEFS[kind]?.label || '', item.x, item.y - 10, CSS.lemon);
  }

  spawnExplosion(x, y, tint = 0xffffff, count = 12) {
    this.explosionFx.setParticleTint(tint);
    this.explosionFx.explode(count, x, y);
  }

  // ---------- 대사 ----------
  showDialogue(lines, onDone) {
    if (!lines || !lines.length) {
      onDone?.();
      return;
    }
    this.player?.endDrag();
    this.scene.launch('DialogueOverlay', {
      caller: 'Game',
      lines: prepareLines(lines, this.nickname),
      onDone: () => onDone?.(),
    });
    this.scene.pause();
  }

  // ---------- HUD·연출 ----------
  addScore(n) {
    this.run.score += n;
    this.updateScore();
  }

  updateScore() {
    this.scoreText.setText(`SCORE ${formatScore(this.run.score)}`);
  }

  updateLives() {
    this.lifeIcons.forEach((icon, i) => icon.setVisible(i < this.run.lives));
  }

  showBanner(main, sub, color, duration = 1600) {
    const c = this.add.container(GAME_W / 2, GAME_H * 0.4).setDepth(DEPTH.banner).setAlpha(0);
    const bg = this.add.rectangle(0, 0, GAME_W, 110, 0x000000, 0.55);
    const t1 = this.add.text(0, sub ? -16 : 0, main, textStyle(36, color, { fontStyle: 'bold', stroke: CSS.ink, strokeThickness: 6 })).setOrigin(0.5);
    c.add([bg, t1]);
    if (sub) c.add(this.add.text(0, 24, sub, textStyle(17, CSS.cream)).setOrigin(0.5));
    this.tweens.add({ targets: c, alpha: 1, scale: { from: 0.8, to: 1 }, duration: 250, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, duration: 300, delay: duration, onComplete: () => c.destroy() });
  }

  showToast(text, color = CSS.cream) {
    // 보스 체력바(98~124)·보스(140) 아래쪽에 표시해 겹침 방지
    const t = this.add.text(GAME_W / 2, 250, text, textStyle(20, color, { fontStyle: 'bold', stroke: CSS.ink, strokeThickness: 5 })).setOrigin(0.5).setDepth(DEPTH.banner).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, y: 236, duration: 200 });
    this.tweens.add({ targets: t, alpha: 0, duration: 300, delay: 1000, onComplete: () => t.destroy() });
  }

  floatText(text, x, y, color) {
    const t = this.add.text(x, y, text, textStyle(15, color, { fontStyle: 'bold', stroke: CSS.ink, strokeThickness: 4 })).setOrigin(0.5).setDepth(DEPTH.banner);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  showTutorial() {
    if (Storage.getTutorialSeen()) return;
    const c = this.add.container(GAME_W / 2, GAME_H / 2 + 40).setDepth(DEPTH.overlay);
    c.add(this.add.rectangle(0, 0, 330, 90, COLORS.ink, 0.72).setStrokeStyle(2, COLORS.serenity, 0.8));
    c.add(this.add.text(0, -14, '드래그로 이동 — 발사는 자동', textStyle(19, CSS.cream, { fontStyle: 'bold' })).setOrigin(0.5));
    c.add(this.add.text(0, 18, '기체는 손가락보다 조금 위에 떠요', textStyle(13, CSS.serenity)).setOrigin(0.5));
    this.tutorial = c;
    this.time.delayedCall(5000, () => this.hideTutorial());
  }

  hideTutorial() {
    if (!this.tutorial) return;
    const t = this.tutorial;
    this.tutorial = null;
    Storage.setTutorialSeen();
    this.tweens.add({ targets: t, alpha: 0, duration: 250, onComplete: () => t.destroy() });
  }

  pauseGame() {
    if (!['waves', 'mid', 'boss', 'boss-intro'].includes(this.state)) return;
    if (this.scene.isActive('DialogueOverlay') || this.scene.isActive('PauseOverlay')) return;
    this.player.endDrag();
    this.scene.launch('PauseOverlay', { caller: 'Game' });
    this.scene.pause();
  }

  update(time, delta) {
    this.player?.update(time, delta);
    this.spawner?.update();
    this.starsFar.tilePositionY -= (40 * delta) / 1000;
    this.starsNear.tilePositionY -= (90 * delta) / 1000;
  }

  cleanup() {
    this.spawner?.stop();
    this.midTimer?.remove(false);
    if (this.onVisibility) {
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.game.events.off('blur', this.onVisibility);
    }
    ['enemy-removed', 'waves-complete', 'wave-start', 'boss-damaged', 'boss-half', 'boss-phase', 'boss-defeated', 'resume'].forEach((e) =>
      this.events.off(e)
    );
  }
}
