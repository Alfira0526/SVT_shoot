import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants.js';

// 아이템 (§3.6)
//  wand  : 응원봉(오리지널 디자인) — 파워업 (탄 2열→3열)
//  seed  : 민들레 꽃씨 — 라이프 +1
//  shield: 단결 실드 — 3초 무적
//  coin  : 빛조각 — 해금 코인 +1 (잡몹 드롭 → 세계 해금 재화)
const ITEM_TEX = { wand: 'item_wand', seed: 'item_seed', shield: 'item_shield', coin: 'coin' };

export class Item extends Phaser.Physics.Arcade.Sprite {
  spawn(kind, x, y) {
    this.kind = kind;
    this.setTexture(ITEM_TEX[kind] || ITEM_TEX.wand);
    this.enableBody(true, x, y, true, true);
    this.setActive(true).setVisible(true);
    this.setVelocity(0, kind === 'coin' ? 95 : 70); // 빛조각은 살짝 빠르게 낙하
    if (kind === 'coin') {
      // 빛조각 — 반짝이는 스케일 펄스(회전 대신)
      this.setScale(1);
      this.scene.tweens.add({ targets: this, scale: 1.18, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      this.scene.tweens.add({ targets: this, angle: 360, duration: 1600, repeat: -1 });
    }
    return this;
  }

  deactivate() {
    this.scene.tweens.killTweensOf(this);
    this.setAngle(0);
    this.setScale(1);
    this.disableBody(true, true);
  }

  preUpdate(t, d) {
    super.preUpdate(t, d);
    if (this.y > GAME_HEIGHT + 30) this.deactivate();
  }
}

export function createItemGroup(scene, max = 12) {
  return scene.physics.add.group({ classType: Item, maxSize: max, runChildUpdate: true });
}

export function itemXToPixels(ratio) {
  return Phaser.Math.Clamp(ratio, 0, 1) * GAME_WIDTH;
}
