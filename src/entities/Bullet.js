import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config/constants.js';

const MARGIN = 48;

// 플레이어 탄·적 탄 공용. 물리 그룹에서 풀링되어 재사용된다.
export default class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture = 'bullet_enemy') {
    super(scene, x, y, texture);
    this.damage = 1;
    this.accel = 0;
    this.spin = 0;
  }

  fire(x, y, vx, vy, texture, opts = {}) {
    if (texture && this.texture.key !== texture) this.setTexture(texture);
    this.enableBody(true, x, y, true, true);
    this.setVelocity(vx, vy);
    this.damage = opts.damage ?? 1;
    this.accel = opts.accel ?? 0;
    this.spin = opts.spin ?? 0;
    this.setAngle(opts.angle ?? 0);
    this.setScale(opts.scale ?? 1);
    this.setAlpha(1);
    if (opts.bodyW && opts.bodyH) {
      this.body.setSize(opts.bodyW, opts.bodyH, true);
    } else if (opts.radius) {
      this.body.setCircle(opts.radius, this.width / 2 - opts.radius, this.height / 2 - opts.radius);
    } else {
      this.body.setSize(this.width, this.height, true);
    }
    return this;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;
    if (this.accel) {
      const f = 1 + (this.accel * delta) / 1000;
      this.body.velocity.scale(f);
    }
    if (this.spin) this.angle += (this.spin * delta) / 1000;
    if (
      this.y < -MARGIN ||
      this.y > GAME_H + MARGIN ||
      this.x < -MARGIN ||
      this.x > GAME_W + MARGIN
    ) {
      this.disableBody(true, true);
    }
  }
}
