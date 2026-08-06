import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../config/constants.js';
import { Save } from '../systems/SaveSystem.js';
import { Audio } from '../systems/Audio.js';
import guardians from '../config/guardians.json';

// 수호자 도감 (13인 각성 컬렉션) — 각성한 빛은 초상화·이름·빛, 잠든 빛은 실루엣.
// 스토리 모드에서 각 스테이지 클리어로 한 명씩 각성 → 여기 채워진다.
export class GuardianScene extends Phaser.Scene {
  constructor() {
    super('Guardian');
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.deep).setOrigin(0);
    for (let i = 0; i < 40; i++) {
      this.add.image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT), 'star')
        .setScale(Phaser.Math.Between(1, 2)).setAlpha(Phaser.Math.FloatBetween(0.15, 0.5))
        .setTint(i % 2 ? PALETTE.rose : PALETTE.serenity);
    }

    const awake = Save.getAwakenedGuardians();
    const isAwake = (g) => g.awake || awake.includes(g.id);
    const count = guardians.roster.filter(isAwake).length;

    this.add.text(GAME_WIDTH / 2, 40, '수호자 도감', { fontSize: '30px', fontStyle: 'bold', color: PALETTE.ink }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 74, `흩어진 빛을 되찾는 중  ·  ${count} / 13`, { fontSize: '14px', color: PALETTE.goldHex }).setOrigin(0.5);

    // 3열 × 5행 그리드
    const cols = 3;
    const x0 = 88, dx = (GAME_WIDTH - x0 * 2) / (cols - 1);
    const y0 = 148, dy = 118;
    guardians.roster.slice(0, 13).forEach((g, i) => {
      const cx = x0 + (i % cols) * dx;
      const cy = y0 + Math.floor(i / cols) * dy;
      this._slot(cx, cy, g, isAwake(g));
    });

    this._backButton();
  }

  _slot(cx, cy, g, awake) {
    const w = 118, h = 104;
    const panel = this.add.graphics();
    panel.fillStyle(awake ? PALETTE.panel : 0x110f1e, 1);
    panel.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 12);
    panel.lineStyle(2, awake ? PALETTE.serenity : 0x2a2540, 0.9);
    panel.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 12);

    if (awake) {
      const key = this.textures.exists(g.portrait) ? g.portrait : 'pt_bongi';
      this.add.image(cx, cy - 14, key).setScale(0.52);
      this.add.text(cx, cy + 30, g.name, { fontSize: '15px', color: PALETTE.ink, fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(cx, cy + 46, g.light, { fontSize: '10px', color: PALETTE.roseHex }).setOrigin(0.5);
      this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { Audio.sfx('ui'); this._detail(g); });
    } else {
      // 잠든 빛 — 실루엣 + 물음표
      this.add.text(cx, cy - 12, '?', { fontSize: '40px', color: '#3a3358', fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(cx, cy + 34, g.light || '잠든 빛', { fontSize: '11px', color: PALETTE.inkDim }).setOrigin(0.5);
    }
  }

  _detail(g) {
    if (this._overlay) return;
    const c = this.add.container(0, 0).setDepth(30);
    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.74).setOrigin(0)
      .setInteractive().on('pointerdown', () => { c.destroy(); this._overlay = null; });
    c.add(dim);
    const key = this.textures.exists(g.portrait) ? g.portrait : 'pt_bongi';
    c.add(this.add.image(GAME_WIDTH / 2, 250, key).setScale(1.5));
    c.add(this.add.text(GAME_WIDTH / 2, 356, g.name, { fontSize: '32px', color: PALETTE.ink, fontStyle: 'bold' }).setOrigin(0.5));
    c.add(this.add.text(GAME_WIDTH / 2, 392, g.light, { fontSize: '16px', color: PALETTE.roseHex, fontStyle: 'bold' }).setOrigin(0.5));
    if (g.personality) {
      c.add(this.add.text(GAME_WIDTH / 2, 440, g.personality, {
        fontSize: '15px', color: PALETTE.inkDim, align: 'center', wordWrap: { width: GAME_WIDTH - 100 }, lineSpacing: 5,
      }).setOrigin(0.5));
    }
    if (g.shadow) {
      c.add(this.add.text(GAME_WIDTH / 2, 512, `흐린 그림자 · ${g.shadow}`, { fontSize: '13px', color: PALETTE.dangerHex }).setOrigin(0.5));
    }
    c.add(this.add.text(GAME_WIDTH / 2, 590, '탭하여 닫기', { fontSize: '13px', color: PALETTE.serenityHex }).setOrigin(0.5));
    this._overlay = c;
  }

  _backButton() {
    const y = GAME_HEIGHT - 52;
    const w = 200, h = 52;
    const g = this.add.graphics();
    g.fillStyle(PALETTE.panel, 1);
    g.fillRoundedRect(GAME_WIDTH / 2 - w / 2, y - h / 2, w, h, 14);
    g.lineStyle(2, PALETTE.serenity, 0.9);
    g.strokeRoundedRect(GAME_WIDTH / 2 - w / 2, y - h / 2, w, h, 14);
    this.add.text(GAME_WIDTH / 2, y, '타이틀로', { fontSize: '19px', color: PALETTE.ink, fontStyle: 'bold' }).setOrigin(0.5);
    this.add.zone(GAME_WIDTH / 2, y, w, h).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { Audio.sfx('ui'); this.scene.start('Title'); });
  }
}
