import Phaser from 'phaser';
import { DEPTH, GAME_H, GAME_W } from '../config/constants.js';

// §3.4 적 구성 — 행동은 타입별 정의, 수치는 여기서 조정
export const ENEMY_DEFS = {
  macro_bot: {
    texture: 'macro_bot',
    hp: 2,
    speed: 125,
    radius: 11,
    shoot: { delay: 900, speed: 170, texture: 'bullet_enemy_blue' },
  },
  spinner: {
    texture: 'spinner',
    hp: 3,
    speed: 105,
    radius: 12,
    sine: { amp: 95, freq: 2.2 },
    spin: 260,
  },
  error_popup: {
    texture: 'error_popup',
    hp: 4,
    speed: 170,
    bodyW: 40,
    bodyH: 26,
    stopY: [150, 330],
    fuse: 1700,
    burst: { count: 10, speed: 165, texture: 'bullet_enemy' },
  },
  noise_mote: {
    texture: 'noise_mote',
    hp: 2,
    speed: 95,
    radius: 10,
    sine: { amp: 55, freq: 3 },
    jitter: true,
  },
};

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture = 'macro_bot') {
    super(scene, x, y, texture);
    this.type = null;
    this.def = null;
  }

  spawn(type, x, y, opts = {}) {
    const def = ENEMY_DEFS[type] || ENEMY_DEFS.macro_bot;
    this.type = type;
    this.def = def;
    this.drop = opts.drop || null;
    this.hp = def.hp;
    this.age = 0;
    this.baseX = x;
    this.stopped = false;
    this.shot = false;
    this.fuseAt = null;
    this.flashUntil = 0;

    if (this.texture.key !== def.texture) this.setTexture(def.texture);
    this.enableBody(true, x, y, true, true);
    this.setDepth(DEPTH.enemies);
    this.setAngle(0);
    this.setAlpha(1);
    this.setScale(1);
    this.clearTint();

    if (def.radius) {
      this.body.setCircle(def.radius, this.width / 2 - def.radius, this.height / 2 - def.radius);
    } else {
      this.body.setSize(def.bodyW || this.width, def.bodyH || this.height, true);
    }
    this.setVelocity(0, def.speed);

    if (type === 'error_popup') {
      this.stopY = Phaser.Math.Between(def.stopY[0], def.stopY[1]);
    }
    return this;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;
    this.age += delta;
    const def = this.def;
    const t = this.age / 1000;

    switch (this.type) {
      case 'macro_bot':
        if (!this.shot && this.age >= def.shoot.delay && this.y > 40 && this.y < GAME_H - 200) {
          this.shot = true;
          this.shootAtPlayer(def.shoot.speed, def.shoot.texture);
        }
        break;
      case 'spinner':
      case 'noise_mote': {
        const s = def.sine;
        this.x = Phaser.Math.Clamp(this.baseX + Math.sin(t * s.freq) * s.amp, 14, GAME_W - 14);
        if (def.spin) this.angle += (def.spin * delta) / 1000;
        if (def.jitter && Math.random() < 0.15) {
          this.setScale(Phaser.Math.FloatBetween(0.9, 1.15));
        }
        break;
      }
      case 'error_popup':
        if (!this.stopped && this.y >= this.stopY) {
          this.stopped = true;
          this.setVelocity(0, 0);
          this.fuseAt = this.age + def.fuse;
        }
        if (this.stopped) {
          // 자폭 직전 깜빡임
          const left = this.fuseAt - this.age;
          this.setAlpha(left < 700 ? (Math.floor(this.age / 80) % 2 ? 0.4 : 1) : 1);
          if (left <= 0) this.selfDestruct();
        }
        break;
      default:
        break;
    }

    if (time < this.flashUntil) this.setTintFill(0xffffff);
    else this.clearTint();

    if (this.y > GAME_H + 40 || this.x < -60 || this.x > GAME_W + 60) {
      this.disableBody(true, true);
    }
  }

  shootAtPlayer(speed, texture) {
    const scene = this.scene;
    const player = scene.player;
    if (!player?.alive) return;
    const b = scene.enemyBullets.get(this.x, this.y + 10, texture);
    if (!b) return;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    b.setDepth(DEPTH.enemyBullets);
    b.fire(this.x, this.y + 10, Math.cos(angle) * speed, Math.sin(angle) * speed, texture, { radius: 4 });
  }

  selfDestruct() {
    const scene = this.scene;
    const { count, speed, texture } = this.def.burst;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count;
      const b = scene.enemyBullets.get(this.x, this.y, texture);
      if (!b) continue;
      b.setDepth(DEPTH.enemyBullets);
      b.fire(this.x, this.y, Math.cos(a) * speed, Math.sin(a) * speed, texture, { radius: 4 });
    }
    scene.spawnExplosion(this.x, this.y, 0xff8a5c, 10);
    scene.events.emit('enemy-removed', this, false);
    this.disableBody(true, true);
  }

  takeDamage(amount, time) {
    if (!this.active) return false;
    this.hp -= amount;
    this.flashUntil = time + 50;
    if (this.hp <= 0) {
      this.scene.events.emit('enemy-removed', this, true);
      this.disableBody(true, true);
      return true;
    }
    return false;
  }
}
