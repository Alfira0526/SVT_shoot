import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../config/constants.js';
import { Save } from '../systems/SaveSystem.js';
import { Audio } from '../systems/Audio.js';
import worldsCfg from '../config/worlds.json';
import guardians from '../config/guardians.json';

const NAME = {};
guardians.roster.forEach((g) => { NAME[g.id] = g.name; });

// 다중세계 지도 — 세계관 렌즈 = 여행할 세계. 스토리 모드의 새 허브(선형 캠페인 대체).
//  progression 세계: 순차 개방(이전 세계 클리어). combination 세계: 특정 정령 조합 보유 시 개방.
export class MultiverseScene extends Phaser.Scene {
  constructor() {
    super('Multiverse');
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.deep).setOrigin(0);
    for (let i = 0; i < 50; i++) {
      this.add.image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT), 'star')
        .setScale(Phaser.Math.Between(1, 2)).setAlpha(Phaser.Math.FloatBetween(0.15, 0.6))
        .setTint(i % 2 ? PALETTE.rose : PALETTE.serenity);
    }

    this.add.text(GAME_WIDTH / 2, 34, '다중세계', { fontSize: '30px', fontStyle: 'bold', color: PALETTE.ink }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 66, '응원봉이 여는 문 — 잠든 빛을 데리러 가자', { fontSize: '13px', color: PALETTE.serenityHex }).setOrigin(0.5);

    const cleared = new Set(Save.getWorldsCleared());
    const awake = new Set(['bongi', ...Save.getAwakenedGuardians()]);
    const order = worldsCfg.progressionOrder || [];

    const rows = worldsCfg.worlds;
    const y0 = 100, rh = 84;
    rows.forEach((w, i) => {
      this._worldRow(w, 24, y0 + i * rh, GAME_WIDTH - 48, rh - 10, this._state(w, cleared, awake, order), cleared.has(w.id));
    });

    this._back();
  }

  _state(w, cleared, awake, order) {
    if (w.entry === 'combination') {
      const missing = w.combo.filter((id) => !awake.has(id));
      return missing.length === 0 ? { open: true } : { open: false, combo: w.combo, missing };
    }
    const idx = order.indexOf(w.id);
    if (idx <= 0) return { open: true };
    const prev = order[idx - 1];
    return cleared.has(prev) ? { open: true } : { open: false, prevName: NAME[prev] || prev, prevWorld: prev };
  }

  _worldRow(w, x, y, ww, hh, st, isCleared) {
    const accent = PALETTE[w.color] || PALETTE.serenity;
    const g = this.add.graphics();
    g.fillStyle(st.open ? PALETTE.panel : 0x100e1c, 1);
    g.fillRoundedRect(x, y, ww, hh, 12);
    g.lineStyle(2, st.open ? accent : 0x2a2540, st.open ? 0.95 : 0.7);
    g.strokeRoundedRect(x, y, ww, hh, 12);
    // 좌측 세계 색 스와치
    g.fillStyle(accent, st.open ? 0.9 : 0.3);
    g.fillRoundedRect(x + 8, y + 12, 8, hh - 24, 4);

    if (st.open) {
      this.add.text(x + 26, y + 12, w.name, { fontSize: '18px', color: PALETTE.ink, fontStyle: 'bold' });
      this.add.text(x + 26, y + 36, `${w.sub}  ·  위협 ${w.threat}`, { fontSize: '11px', color: PALETTE.inkDim });
      const spNames = w.spirits.map((id) => NAME[id] || id).join(', ');
      this.add.text(x + 26, y + 54, `정령 ${spNames}`, { fontSize: '11px', color: accent === PALETTE.gold ? PALETTE.goldHex : PALETTE.roseHex });
      if (isCleared) this.add.text(x + ww - 14, y + 14, '✓ 클리어', { fontSize: '12px', color: PALETTE.okHex || '#4be08a', fontStyle: 'bold' }).setOrigin(1, 0);
      this.add.text(x + ww - 14, y + hh - 16, '▶', { fontSize: '20px', color: accent === PALETTE.gold ? PALETTE.goldHex : PALETTE.serenityHex }).setOrigin(1, 0.5);
      this.add.zone(x + ww / 2, y + hh / 2, ww, hh).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { Audio.unlock(); Audio.sfx('ui'); this.scene.start('Game', { worldId: w.id }); });
    } else {
      this.add.text(x + 26, y + 14, '🔒 ' + w.name, { fontSize: '17px', color: '#5a5378', fontStyle: 'bold' });
      if (st.combo) {
        const req = st.combo.map((id) => (st.missing.includes(id) ? NAME[id] : `[${NAME[id]}]`)).join(' · ');
        this.add.text(x + 26, y + 40, '조합 필요', { fontSize: '11px', color: PALETTE.goldHex });
        this.add.text(x + 26, y + 56, req, { fontSize: '11px', color: PALETTE.inkDim });
      } else {
        this.add.text(x + 26, y + 44, `이전 세계 클리어 필요`, { fontSize: '12px', color: PALETTE.inkDim });
      }
    }
  }

  _back() {
    const y = GAME_HEIGHT - 40, w = 180, h = 44;
    const g = this.add.graphics();
    g.fillStyle(PALETTE.panel, 1); g.fillRoundedRect(GAME_WIDTH / 2 - w / 2, y - h / 2, w, h, 12);
    g.lineStyle(2, PALETTE.serenity, 0.9); g.strokeRoundedRect(GAME_WIDTH / 2 - w / 2, y - h / 2, w, h, 12);
    this.add.text(GAME_WIDTH / 2, y, '타이틀로', { fontSize: '17px', color: PALETTE.ink, fontStyle: 'bold' }).setOrigin(0.5);
    this.add.zone(GAME_WIDTH / 2, y, w, h).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { Audio.sfx('ui'); this.scene.start('Title'); });
  }
}
