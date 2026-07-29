import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../config/constants.js';
import prologueData from '../config/dialogue_prologue.json';
import { safeDisplayName } from '../systems/Filter.js';
import { Save } from '../systems/SaveSystem.js';

// 프롤로그 (D25) — 스테이지 없는 순수 대사 Scene. 창세신화 전달.
export class PrologueScene extends Phaser.Scene {
  constructor() {
    super('Prologue');
  }

  create() {
    // 콘서트장 밤하늘 분위기
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.deep).setOrigin(0);
    for (let i = 0; i < 60; i++) {
      const s = this.add
        .image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT * 0.7), 'star')
        .setScale(Phaser.Math.Between(1, 2))
        .setTint(i % 2 ? PALETTE.rose : PALETTE.serenity)
        .setAlpha(Phaser.Math.FloatBetween(0.3, 1));
      this.tweens.add({ targets: s, alpha: 0.15, duration: Phaser.Math.Between(700, 1800), yoyo: true, repeat: -1 });
    }
    // 떠다니는 응원봉 빛 바다
    for (let i = 0; i < 24; i++) {
      const l = this.add
        .image(Phaser.Math.Between(10, GAME_WIDTH - 10), Phaser.Math.Between(GAME_HEIGHT * 0.6, GAME_HEIGHT - 20), 'spark')
        .setTint(PALETTE.light)
        .setScale(Phaser.Math.FloatBetween(0.8, 1.6));
      this.tweens.add({ targets: l, y: l.y - 12, duration: Phaser.Math.Between(1200, 2400), yoyo: true, repeat: -1 });
    }

    const nickname = safeDisplayName(this.registry.get('nickname'));
    this.scene.launch('Dialogue', {
      lines: prologueData.lines,
      nickname,
      onComplete: () => {
        Save.setFlag('prologueSeen'); // 재방문 시 프롤로그 스킵 (§11)
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('Game', { stageId: 'w1' });
        });
      },
    });
  }
}
