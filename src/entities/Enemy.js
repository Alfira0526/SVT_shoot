import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants.js';

// 잡몹 (§3.4)
//  macro   : 매크로 봇 — 직선 하강, 저속 탄 1발
//  spinner : 로딩 스피너 — 좌우 사인파, 무탄(충돌 데미지)
//  popup   : 오류 팝업 — 잠깐 고정 후 자폭탄 확산
const DEFS = {
  macro: { texture: 'enemy_macro', hp: 30, score: 100, contact: true, vy: 90 },
  spinner: { texture: 'enemy_spinner', hp: 40, score: 100, contact: true, vy: 70 },
  popup: { texture: 'enemy_popup', hp: 55, score: 100, contact: true, vy: 40 },
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  spawn(type, x, y) {
    const def = DEFS[type] || DEFS.macro;
    this.enemyType = type;
    this.def = def;
    this.hp = def.hp;
    this.score = def.score;
    this.bornAt = this.scene.time.now;
    this.state2 = 'move';
    this.baseX = x;

    this.setTexture(def.texture);
    this.enableBody(true, x, y, true, true);
    this.setActive(true).setVisible(true);
    this.setVelocity(0, def.vy);
    this._nextShot = this.scene.time.now + 700;
    return this;
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    this.scene.tweens.add({ targets: this, alpha: 0.4, duration: 40, yoyo: true });
    return this.hp <= 0;
  }

  deactivate() {
    this.disableBody(true, true);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;

    if (this.enemyType === 'spinner') {
      // 좌우 사인파
      const t = (time - this.bornAt) / 1000;
      this.x = this.baseX + Math.sin(t * 3) * 70;
    } else if (this.enemyType === 'macro') {
      // 저속 탄 1발 (하강 중 1회)
      if (time > this._nextShot && this.y > 40 && this.y < GAME_HEIGHT * 0.7) {
        this._nextShot = Infinity;
        this.scene.enemyFireAt?.(this.x, this.y + 14, 0, 150);
      }
    } else if (this.enemyType === 'popup') {
      // 화면 상단 고정 후 자폭탄 확산
      if (this.state2 === 'move' && this.y >= GAME_HEIGHT * 0.28) {
        this.state2 = 'lock';
        this.setVelocity(0, 0);
        this._detonateAt = time + 1300;
      } else if (this.state2 === 'lock' && time >= this._detonateAt) {
        this.state2 = 'boom';
        this._burst();
      }
    }

    if (this.y > GAME_HEIGHT + 40) this.deactivate();
  }

  _burst() {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      this.scene.enemyFireAt?.(this.x, this.y, Math.cos(a) * 130, Math.sin(a) * 130);
    }
    this.scene.spawnExplosion?.(this.x, this.y, 0.7);
    this.deactivate();
  }
}

export function createEnemyGroup(scene, max = 64) {
  return scene.physics.add.group({ classType: Enemy, maxSize: max, runChildUpdate: true });
}

// 중간 패턴: 대기열 폭주 — 999,999 숫자 스프라이트가 가로지르며 탄막 (§3.4)
export function spawnQueueSurge(scene) {
  const y = 120;
  const num = scene.add
    .image(-80, y, 'queue_number')
    .setDepth(6)
    .setScrollFactor(0);
  scene.tweens.add({
    targets: num,
    x: GAME_WIDTH + 80,
    duration: 3400,
    ease: 'Sine.easeInOut',
    onComplete: () => num.destroy(),
  });
  // 이동 중 주기적으로 아래로 탄 살포
  let count = 0;
  const timer = scene.time.addEvent({
    delay: 260,
    repeat: 11,
    callback: () => {
      count++;
      const spread = 3;
      for (let i = 0; i < spread; i++) {
        const vx = (i - 1) * 60;
        scene.enemyFireAt?.(num.x, y + 10, vx, 150);
      }
      if (count > 11) timer.remove();
    },
  });
}
