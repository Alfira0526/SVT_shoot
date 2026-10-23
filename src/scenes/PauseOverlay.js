import Phaser from 'phaser';
import { COLORS, CSS, DEPTH, GAME_H, GAME_W } from '../config/constants.js';
import { makeButton, makePanel, textStyle } from '../systems/ui.js';
import { Audio } from '../systems/Audio.js';

// §11 일시정지: 재개 / 재시작 / 타이틀로
export default class PauseOverlay extends Phaser.Scene {
  constructor() {
    super('PauseOverlay');
  }

  create(data) {
    const caller = data.caller || 'Game';
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.6).setDepth(DEPTH.overlay).setInteractive();
    makePanel(this, GAME_W / 2, GAME_H / 2, 300, 320).setDepth(DEPTH.overlay + 1);
    this.add.text(GAME_W / 2, GAME_H / 2 - 120, '일시정지', textStyle(26, CSS.cream, { fontStyle: 'bold' })).setOrigin(0.5).setDepth(DEPTH.overlay + 2);

    makeButton(this, GAME_W / 2, GAME_H / 2 - 50, '재개', () => {
      this.scene.resume(caller);
      this.scene.stop();
    }, { w: 230, color: COLORS.rose }).setDepth(DEPTH.overlay + 2);

    makeButton(this, GAME_W / 2, GAME_H / 2 + 20, '재시작', () => {
      Audio.stopBgm();
      this.scene.stop(caller);
      this.scene.start('Game', { stageId: 'w1' });
      this.scene.stop();
    }, { w: 230, color: COLORS.serenity }).setDepth(DEPTH.overlay + 2);

    makeButton(this, GAME_W / 2, GAME_H / 2 + 90, '타이틀로', () => {
      Audio.stopBgm();
      this.scene.stop(caller);
      this.scene.start('Title');
      this.scene.stop();
    }, { w: 230, color: COLORS.grape }).setDepth(DEPTH.overlay + 2);

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.resume(caller);
      this.scene.stop();
    });
  }
}
