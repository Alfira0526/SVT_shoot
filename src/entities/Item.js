import Phaser from 'phaser';
import { DEPTH, GAME_H } from '../config/constants.js';

// §3.6 아이템 — 응원봉(파워업), 민들레 꽃씨(라이프+1), 단결 실드(3초 무적)
export const ITEM_DEFS = {
  lightstick: { texture: 'item_lightstick', label: '파워업!' },
  seed: { texture: 'item_seed', label: '라이프 +1' },
  shield: { texture: 'item_shield', label: '단결 실드' },
};

export default class Item extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture = 'item_lightstick') {
    super(scene, x, y, texture);
    this.kind = 'lightstick';
  }

  drop(kind, x, y) {
    const def = ITEM_DEFS[kind] || ITEM_DEFS.lightstick;
    this.kind = kind;
    if (this.texture.key !== def.texture) this.setTexture(def.texture);
    this.enableBody(true, x, y, true, true);
    this.setDepth(DEPTH.items);
    this.setVelocity(Phaser.Math.Between(-20, 20), 70);
    this.body.setCircle(14, this.width / 2 - 14, this.height / 2 - 14);
    this.age = 0;
    this.baseX = x;
    this.setScale(1.3);
    return this;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;
    this.age += delta;
    this.setScale(1.3 + Math.sin(this.age / 160) * 0.12);
    if (this.y > GAME_H + 30) this.disableBody(true, true);
  }
}
