import Phaser from 'phaser';
import { COLORS, CSS, DEPTH, GAME_H, GAME_W } from '../config/constants.js';
import { Audio } from '../systems/Audio.js';
import { portraitKey } from '../systems/Assets.js';
import { sideOf } from '../systems/Dialogue.js';
import { makeButton, textStyle } from '../systems/ui.js';

const BOX_H = 212;
const BOX_Y = GAME_H - BOX_H - 14;
const TYPE_MS = 26;

const NAME_COLORS = {
  봉이: CSS.lemon,
  서버: CSS.danger,
  노이즈: CSS.grape,
  '???': CSS.gray,
};

// D12·§3.8 — 하단 대사창 + 좌우 초상화, 탭 넘김, 스킵·빨리감기.
// data: { caller, lines, onDone, onSkip?, skipLabel? }
export default class DialogueOverlay extends Phaser.Scene {
  constructor() {
    super('DialogueOverlay');
  }

  create(data) {
    this.caller = data.caller;
    this.lines = data.lines || [];
    this.onDone = data.onDone;
    this.onSkip = data.onSkip;
    this.idx = -1;
    this.fast = false;
    this.typing = false;
    this.finished = false;

    // 대사창
    const box = this.add.graphics().setDepth(DEPTH.overlay);
    box.fillStyle(COLORS.panel, 0.94);
    box.fillRoundedRect(12, BOX_Y, GAME_W - 24, BOX_H, 16);
    box.lineStyle(2, COLORS.grape, 0.9);
    box.strokeRoundedRect(12, BOX_Y, GAME_W - 24, BOX_H, 16);

    // 초상화 슬롯 — 왼쪽: 봉이/보스, 오른쪽: 플레이어
    const leftName = this.lines.map((l) => l.portrait).find((p) => p && p !== 'none' && sideOf(p) === 'left');
    const rightName = this.lines.some((l) => l.portrait === 'player') ? 'player' : null;
    this.leftPortrait = leftName ? this.add.image(88, BOX_Y - 62, portraitKey(this, leftName)).setDepth(DEPTH.overlay + 1) : null;
    this.rightPortrait = rightName ? this.add.image(GAME_W - 88, BOX_Y - 62, portraitKey(this, rightName)).setDepth(DEPTH.overlay + 1) : null;

    this.nameText = this.add.text(34, BOX_Y + 16, '', textStyle(18, CSS.lemon, { fontStyle: 'bold' })).setDepth(DEPTH.overlay + 2);
    this.bodyText = this.add
      .text(34, BOX_Y + 50, '', textStyle(20, CSS.cream, { wordWrap: { width: GAME_W - 80 }, lineSpacing: 7 }))
      .setDepth(DEPTH.overlay + 2);
    this.hint = this.add
      .text(GAME_W - 34, BOX_Y + BOX_H - 22, '▼ 탭', textStyle(13, CSS.serenity))
      .setOrigin(1, 0.5)
      .setDepth(DEPTH.overlay + 2)
      .setVisible(false);
    this.tweens.add({ targets: this.hint, alpha: { from: 1, to: 0.3 }, duration: 500, yoyo: true, repeat: -1 });

    // 스킵 · 빨리감기 (§3.8 필수)
    this.skipBtn = makeButton(this, GAME_W - 62, 36, data.skipLabel || '스킵 ▶▶', () => this.skip(), {
      w: 100,
      h: 36,
      fontSize: 15,
      color: COLORS.panel,
      textColor: CSS.cream,
    }).setDepth(DEPTH.overlay + 3);
    this.fastBtn = makeButton(this, GAME_W - 172, 36, '빨리감기', () => this.toggleFast(), {
      w: 100,
      h: 36,
      fontSize: 15,
      color: COLORS.panel,
      textColor: CSS.cream,
    }).setDepth(DEPTH.overlay + 3);

    this.input.on('pointerdown', () => this.advance());
    this.input.keyboard?.on('keydown-SPACE', () => this.advance());
    this.input.keyboard?.on('keydown-ENTER', () => this.advance());
    this.input.keyboard?.on('keydown-ESC', () => this.skip());

    this.events.once('shutdown', () => {
      this.typeTimer?.remove(false);
      this.autoTimer?.remove(false);
    });

    this.showLine(0);
  }

  showLine(i) {
    if (i >= this.lines.length) {
      this.finish();
      return;
    }
    this.idx = i;
    const line = this.lines[i];
    const narration = !line.speaker;

    this.nameText.setText(line.speaker).setColor(NAME_COLORS[line.speaker] || (line.portrait === 'player' ? CSS.rose : CSS.cream));
    this.nameText.setVisible(!narration);
    this.bodyText.setStyle({ fontStyle: narration ? 'italic' : 'normal', color: narration ? CSS.serenity : CSS.cream });
    this.bodyText.setY(narration ? BOX_Y + 40 : BOX_Y + 50);

    const side = narration ? null : sideOf(line.portrait);
    const active = (img, on) => img && img.setAlpha(on ? 1 : 0.35).setScale(on ? 1 : 0.94);
    active(this.leftPortrait, side === 'left' && line.portrait !== 'none');
    active(this.rightPortrait, side === 'right');
    if (!narration && line.portrait && line.portrait !== 'none' && line.portrait !== 'player' && this.leftPortrait) {
      this.leftPortrait.setTexture(portraitKey(this, line.portrait));
    }

    this.applyEffect(line.effect);

    this.full = line.text;
    this.shown = 0;
    this.bodyText.setText('');
    this.hint.setVisible(false);
    this.typing = true;
    this.typeTimer?.remove(false);
    if (this.fast) {
      this.completeLine();
      return;
    }
    this.typeTimer = this.time.addEvent({
      delay: TYPE_MS,
      loop: true,
      callback: () => {
        this.shown += 1;
        this.bodyText.setText(this.full.slice(0, this.shown));
        if (this.shown % 2 === 0) Audio.sfx('blip');
        if (this.shown >= this.full.length) this.completeLine();
      },
    });
  }

  completeLine() {
    this.typeTimer?.remove(false);
    this.typeTimer = null;
    this.bodyText.setText(this.full);
    this.typing = false;
    this.hint.setVisible(true);
    if (this.fast) {
      this.autoTimer?.remove(false);
      this.autoTimer = this.time.delayedCall(420, () => this.showLine(this.idx + 1));
    }
  }

  advance() {
    if (this.finished) return;
    if (this.typing) this.completeLine();
    else this.showLine(this.idx + 1);
  }

  toggleFast() {
    this.fast = !this.fast;
    this.fastBtn.setLabel(this.fast ? '▶▶ 켜짐' : '빨리감기');
    if (this.fast && this.typing) this.completeLine();
    else if (this.fast) {
      this.autoTimer?.remove(false);
      this.autoTimer = this.time.delayedCall(300, () => this.showLine(this.idx + 1));
    } else {
      this.autoTimer?.remove(false);
    }
  }

  applyEffect(effect) {
    switch (effect) {
      case 'shake':
        this.cameras.main.shake(220, 0.012);
        break;
      case 'flash':
        this.cameras.main.flash(250, 255, 255, 255);
        break;
      case 'glitch':
        Audio.sfx('glitch');
        this.tweens.add({ targets: this.bodyText, x: { from: 30, to: 38 }, duration: 40, yoyo: true, repeat: 7, onComplete: () => this.bodyText.setX(34) });
        break;
      default:
        break;
    }
  }

  skip() {
    if (this.finished) return;
    if (this.onSkip) {
      this.finished = true;
      this.scene.resume(this.caller);
      const cb = this.onSkip;
      this.scene.stop();
      cb();
      return;
    }
    this.finish();
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.scene.resume(this.caller);
    const cb = this.onDone;
    this.scene.stop();
    cb?.();
  }
}
