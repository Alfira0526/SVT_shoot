import Phaser from 'phaser';
import { COLORS, DEPTH, GAME_H, GAME_W, PLAYER } from '../config/constants.js';
import { Audio } from '../systems/Audio.js';

// §3.3 조작: 터치 드래그(손가락 오프셋) + 자동 발사 / PC: 마우스 드래그·방향키
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.player);
    this.setCollideWorldBounds(true);
    this.body.setCircle(PLAYER.hitRadius, this.width / 2 - PLAYER.hitRadius, this.height / 2 - PLAYER.hitRadius);

    this.power = PLAYER.basePower;
    this.invincibleUntil = 0;
    this.shieldUntil = 0;
    this.lastShot = 0;
    this.target = null; // 드래그 목표 지점
    this.dragOffset = new Phaser.Math.Vector2(0, PLAYER.fingerOffsetY);
    this.alive = true;
    this.canShoot = true;

    this.shieldFx = scene.add
      .circle(x, y, 26)
      .setStrokeStyle(3, COLORS.serenity, 0.9)
      .setFillStyle(COLORS.serenity, 0.12)
      .setDepth(DEPTH.player - 1)
      .setVisible(false);
    this.hitDot = scene.add.circle(x, y, 3, COLORS.white, 0.9).setDepth(DEPTH.player + 1);

    this.cursors = scene.input.keyboard?.createCursorKeys();
    this.wasd = scene.input.keyboard?.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
  }

  // ---- 입력 (Game 씬이 호출) ----
  beginDrag(pointer) {
    const dx = this.x - pointer.worldX;
    const dy = this.y - pointer.worldY;
    // 기체 근처를 찍으면 손가락 오프셋(위쪽) 적용, 멀리 찍으면 현재 상대 위치 유지
    if (Math.hypot(dx, dy) < 60) {
      this.dragOffset.set(0, PLAYER.fingerOffsetY);
    } else {
      this.dragOffset.set(dx, dy);
    }
    this.updateDrag(pointer);
  }

  updateDrag(pointer) {
    this.target = {
      x: Phaser.Math.Clamp(pointer.worldX + this.dragOffset.x, 16, GAME_W - 16),
      y: Phaser.Math.Clamp(pointer.worldY + this.dragOffset.y, 60, GAME_H - 20),
    };
  }

  endDrag() {
    this.target = null;
  }

  update(time, delta) {
    if (!this.alive) return;
    const dt = delta / 1000;

    // 드래그 추종
    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      const step = PLAYER.dragSpeed * dt;
      if (dist <= step) {
        this.setPosition(this.target.x, this.target.y);
      } else {
        this.setPosition(this.x + (dx / dist) * step, this.y + (dy / dist) * step);
      }
      this.setVelocity(0, 0);
    } else {
      // 키보드
      let vx = 0;
      let vy = 0;
      const c = this.cursors;
      const w = this.wasd;
      if (c?.left.isDown || w?.left.isDown) vx = -1;
      if (c?.right.isDown || w?.right.isDown) vx = 1;
      if (c?.up.isDown || w?.up.isDown) vy = -1;
      if (c?.down.isDown || w?.down.isDown) vy = 1;
      if (vx || vy) {
        const len = Math.hypot(vx, vy);
        this.setVelocity((vx / len) * PLAYER.keyboardSpeed, (vy / len) * PLAYER.keyboardSpeed);
      } else {
        this.setVelocity(0, 0);
      }
    }
    this.y = Phaser.Math.Clamp(this.y, 60, GAME_H - 20);

    // 자동 발사
    if (this.canShoot && time - this.lastShot >= PLAYER.fireIntervalMs) {
      this.lastShot = time;
      this.fire();
    }

    // 무적 깜빡임
    if (time < this.invincibleUntil) {
      this.setAlpha(Math.floor(time / 70) % 2 ? 0.25 : 0.9);
    } else {
      this.setAlpha(1);
    }

    // 실드 이펙트
    const shield = time < this.shieldUntil;
    this.shieldFx.setVisible(shield).setPosition(this.x, this.y);
    if (shield) this.shieldFx.setScale(1 + Math.sin(time / 90) * 0.06);
    this.hitDot.setPosition(this.x, this.y).setVisible(true);
  }

  fire() {
    const group = this.scene.playerBullets;
    if (!group) return;
    const offsets = this.power >= 3 ? [-14, 0, 14] : [-7, 7];
    for (const ox of offsets) {
      const b = group.get(this.x + ox, this.y - 14, 'bullet_player');
      if (!b) continue;
      b.setDepth(DEPTH.playerBullets);
      b.fire(this.x + ox, this.y - 14, 0, -PLAYER.bulletSpeed, 'bullet_player', { damage: PLAYER.bulletDamage });
    }
    Audio.sfx('shoot');
  }

  isInvincible(time) {
    return time < this.invincibleUntil || time < this.shieldUntil;
  }

  // 피격 성공 시 true (잔기 차감은 Game 씬에서)
  takeHit(time) {
    if (!this.alive || this.isInvincible(time)) return false;
    this.invincibleUntil = time + PLAYER.invincibleMs;
    this.power = PLAYER.basePower;
    return true;
  }

  addPower() {
    this.power = Math.min(PLAYER.maxPower, this.power + 1);
  }

  grantShield(time) {
    this.shieldUntil = time + PLAYER.shieldMs;
  }

  die() {
    this.alive = false;
    this.setVisible(false);
    this.body.enable = false;
    this.shieldFx.setVisible(false);
    this.hitDot.setVisible(false);
  }
}
