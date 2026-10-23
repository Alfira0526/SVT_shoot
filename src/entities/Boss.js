import Phaser from 'phaser';
import { DEPTH, GAME_W } from '../config/constants.js';
import { Audio } from '../systems/Audio.js';

const TEXTURE_BY_TYPE = {
  ticket_server: 'boss_server',
  small_noise: 'boss_noise',
};
const BULLET_BY_TYPE = {
  ticket_server: 'bullet_enemy',
  small_noise: 'bullet_enemy_noise',
};

// §3.5 보스 페이즈 — 패턴은 스테이지 JSON의 phases 배열로 데이터 구동
export default class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, def) {
    super(scene, GAME_W / 2, -120, TEXTURE_BY_TYPE[def.type] || 'boss_server');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.enemies + 1);
    this.body.setSize(this.width * 0.8, this.height * 0.8, true);
    this.body.setImmovable(true);

    this.def = def;
    this.bulletTexture = BULLET_BY_TYPE[def.type] || 'bullet_enemy';
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.phases = def.phases || [];
    this.phaseIdx = -1;
    this.phase = null;
    this.fighting = false; // 전투 활성 플래그 (Phaser의 active와 별개)
    this.patternTimer = 0;
    this.summonTimer = 0;
    this.ringOffset = 0;
    this.accel = 1;
    this.halfEmitted = false;
    this.flashUntil = 0;
    this.elapsed = 0;
    this.defeated = false;
  }

  enter(onReady) {
    this.scene.tweens.add({
      targets: this,
      y: this.def.entryY ?? 140,
      duration: 1600,
      ease: 'Sine.easeOut',
      onComplete: () => onReady?.(),
    });
    this.scene.tweens.add({
      targets: this,
      scale: { from: 1, to: 1.05 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  activate() {
    this.fighting = true;
    this.enterPhase(0);
    this.sway = this.scene.tweens.add({
      targets: this,
      x: { from: GAME_W / 2 - 110, to: GAME_W / 2 + 110 },
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  enterPhase(i) {
    if (i >= this.phases.length) return;
    this.phaseIdx = i;
    this.phase = this.phases[i];
    this.patternTimer = 500;
    this.summonTimer = this.phase.summonInterval || 0;
    this.accel = 1;
    this.scene.events.emit('boss-phase', i, this.phase);
    if (this.phase.pattern === 'refresh') this.refreshFlash(false);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.fighting || this.defeated) return;
    this.elapsed += delta;

    if (time < this.flashUntil) this.setTintFill(0xffffff);
    else this.clearTint();

    const p = this.phase;
    if (!p) return;

    if (p.accelPerSec) {
      this.accel = Math.min(p.maxAccel || 2, this.accel + (p.accelPerSec * delta) / 1000);
    }

    this.patternTimer -= delta;
    if (this.patternTimer <= 0) {
      this.patternTimer = p.interval || 1000;
      this.runPattern(p);
    }

    if (p.summon && p.summonInterval) {
      this.summonTimer -= delta;
      if (this.summonTimer <= 0) {
        this.summonTimer = p.summonInterval;
        this.scene.summonFromBoss(p.summon, p.summonCount || 2, this.x, this.y + 30);
      }
    }
  }

  runPattern(p) {
    switch (p.pattern) {
      case 'fan':
        this.patternFan(p);
        break;
      case 'refresh':
        this.patternRefresh(p);
        break;
      case 'omni':
        this.patternOmni(p);
        break;
      default:
        this.patternFan(p);
    }
  }

  fireBullet(angle, speed, opts = {}) {
    const b = this.scene.enemyBullets.get(this.x, this.y + 30, this.bulletTexture);
    if (!b) return null;
    b.setDepth(DEPTH.enemyBullets);
    b.fire(this.x, this.y + 30, Math.cos(angle) * speed, Math.sin(angle) * speed, this.bulletTexture, {
      radius: 4,
      ...opts,
    });
    return b;
  }

  // P1 — 플레이어 방향 부채꼴
  patternFan(p) {
    const player = this.scene.player;
    const base = player?.alive ? Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y) : Math.PI / 2;
    const n = p.bullets || 7;
    const spread = Phaser.Math.DegToRad(p.spread || 100);
    for (let i = 0; i < n; i++) {
      const a = base - spread / 2 + (spread * i) / (n - 1);
      this.fireBullet(a, p.speed || 200);
    }
    Audio.sfx('hit');
  }

  // P2 — "새로고침" 플래시 후 탄 재배치 + 무작위 살포.
  // 재배치된 탄은 0.35초간 반투명·정지 상태(텔레그래프)였다가 움직인다 — 플래시 직후 즉사 방지.
  patternRefresh(p) {
    this.refreshFlash(true);
    const grace = p.graceMs ?? 350;
    const frozen = [];
    const bullets = this.scene.enemyBullets.getChildren();
    for (const b of bullets) {
      if (!b.active) continue;
      b.setPosition(Phaser.Math.Between(20, GAME_W - 20), Phaser.Math.Between(60, 380));
      const a = Phaser.Math.DegToRad(Phaser.Math.Between(50, 130));
      const s = p.speed || 210;
      frozen.push([b, Math.cos(a) * s, Math.sin(a) * s]);
    }
    const n = p.bullets || 14;
    for (let i = 0; i < n; i++) {
      const a = Phaser.Math.DegToRad(Phaser.Math.Between(20, 160));
      const b = this.fireBullet(a, (p.speed || 210) * Phaser.Math.FloatBetween(0.7, 1.1));
      if (b) frozen.push([b, b.body.velocity.x, b.body.velocity.y]);
    }
    for (const [b] of frozen) {
      b.setVelocity(0, 0);
      b.setAlpha(0.35);
      b.body.enable = false;
    }
    this.scene.time.delayedCall(grace, () => {
      for (const [b, vx, vy] of frozen) {
        if (!b.active) continue;
        b.body.enable = true;
        b.setAlpha(1);
        b.setVelocity(vx, vy);
      }
    });
  }

  refreshFlash(withSfx) {
    this.scene.cameras.main.flash(180, 255, 255, 255);
    if (withSfx) Audio.sfx('refresh');
    this.scene.showBossLabel(this.phase?.label || '새로고침');
  }

  // P3 — 전방위 회전 탄막 + 가속
  patternOmni(p) {
    const n = p.bullets || 16;
    this.ringOffset += Phaser.Math.DegToRad(11);
    for (let i = 0; i < n; i++) {
      const a = this.ringOffset + (Math.PI * 2 * i) / n;
      this.fireBullet(a, (p.speed || 170) * this.accel, { accel: 0.08 });
    }
  }

  takeDamage(amount, time) {
    if (!this.fighting || this.defeated) return;
    this.hp = Math.max(0, this.hp - amount);
    this.flashUntil = time + 40;
    this.scene.events.emit('boss-damaged', this.hp, this.maxHp);

    if (!this.halfEmitted && this.hp <= this.maxHp * 0.5) {
      this.halfEmitted = true;
      this.scene.events.emit('boss-half');
    }

    const ratio = this.hp / this.maxHp;
    const nextIdx = this.phaseIdx + 1;
    if (nextIdx < this.phases.length && ratio <= this.phases[this.phaseIdx].until) {
      this.enterPhase(nextIdx);
    }

    if (this.hp <= 0) {
      this.defeated = true;
      this.fighting = false;
      this.sway?.stop();
      this.body.enable = false;
      this.scene.events.emit('boss-defeated', this);
    }
  }
}
