import Phaser from 'phaser';
import { PLAYER, GAME_WIDTH, GAME_HEIGHT } from '../config/constants.js';

// 플레이어 기체 — 터치 드래그 이동(오프셋), 자동 발사(§3.3).
export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player_ship');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.body.setCircle(PLAYER.hitRadius, 16 - PLAYER.hitRadius, 16 - PLAYER.hitRadius);

    this.lives = PLAYER.startLives;
    this.power = 1; // 탄 열 수 (1→최대 3)
    this.invincibleUntil = 0;
    this.shieldUntil = 0; // 단결 실드
    this.lastFire = 0;

    this.target = new Phaser.Math.Vector2(x, y);
    this._dragging = false;

    this._bindInput(scene);
  }

  _bindInput(scene) {
    scene.input.on('pointerdown', (p) => {
      this._dragging = true;
      this._aimTo(p);
    });
    scene.input.on('pointermove', (p) => {
      if (p.isDown || this._dragging) this._aimTo(p);
    });
    scene.input.on('pointerup', () => {
      this._dragging = false;
    });

    // PC 폴백: 방향키
    this.cursors = scene.input.keyboard?.createCursorKeys();
  }

  _aimTo(pointer) {
    // 손가락 위 오프셋 — 기체가 손가락에 가려지지 않게
    this.target.set(
      Phaser.Math.Clamp(pointer.x, 16, GAME_WIDTH - 16),
      Phaser.Math.Clamp(pointer.y - PLAYER.dragOffsetY, 24, GAME_HEIGHT - 24)
    );
  }

  isInvincible(now) {
    return now < this.invincibleUntil || now < this.shieldUntil;
  }

  hasShield(now) {
    return now < this.shieldUntil;
  }

  addShield(ms) {
    this.shieldUntil = this.scene.time.now + ms;
  }

  addLife(n = 1) {
    this.lives += n;
  }

  powerUp() {
    this.power = Math.min(PLAYER.maxPower, this.power + 1);
  }

  /** 피격 처리 — 무적/실드면 무시. @returns {boolean} 실제 피격 여부 */
  hit(now) {
    if (this.isInvincible(now)) return false;
    this.lives -= 1;
    this.invincibleUntil = now + PLAYER.invincibleMs;
    return true;
  }

  update(now, onFire) {
    // 키보드 폴백 이동
    if (this.cursors) {
      const step = 6;
      if (this.cursors.left.isDown) this.target.x -= step;
      if (this.cursors.right.isDown) this.target.x += step;
      if (this.cursors.up.isDown) this.target.y -= step;
      if (this.cursors.down.isDown) this.target.y += step;
      this.target.x = Phaser.Math.Clamp(this.target.x, 16, GAME_WIDTH - 16);
      this.target.y = Phaser.Math.Clamp(this.target.y, 24, GAME_HEIGHT - 24);
    }

    // 드래그 추종 (보간)
    this.x = Phaser.Math.Linear(this.x, this.target.x, PLAYER.speedLerp);
    this.y = Phaser.Math.Linear(this.y, this.target.y, PLAYER.speedLerp);

    // 무적 깜빡임
    this.setAlpha(this.isInvincible(now) ? (Math.floor(now / 80) % 2 ? 0.35 : 1) : 1);

    // 자동 발사
    if (now - this.lastFire >= PLAYER.fireIntervalMs) {
      this.lastFire = now;
      onFire(this.getFirePoints());
    }
  }

  // 파워에 따른 발사 지점(열) 목록
  getFirePoints() {
    const pts = [];
    if (this.power <= 1) {
      pts.push({ x: this.x, y: this.y - 18, vx: 0 });
    } else if (this.power === 2) {
      pts.push({ x: this.x - 7, y: this.y - 16, vx: 0 });
      pts.push({ x: this.x + 7, y: this.y - 16, vx: 0 });
    } else {
      pts.push({ x: this.x, y: this.y - 18, vx: 0 });
      pts.push({ x: this.x - 10, y: this.y - 12, vx: -40 });
      pts.push({ x: this.x + 10, y: this.y - 12, vx: 40 });
    }
    return pts;
  }
}
