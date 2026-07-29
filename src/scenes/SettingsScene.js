import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE, NICKNAME } from '../config/constants.js';
import { Save } from '../systems/SaveSystem.js';
import { Audio } from '../systems/Audio.js';
import { validateNickname } from '../systems/Filter.js';

// 설정 (§11) — BGM/SFX 토글, 닉네임 변경, 데이터 초기화(2단계 확인)
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.deep).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 70, '설정', { fontSize: '30px', fontStyle: 'bold', color: PALETTE.ink }).setOrigin(0.5);

    const s = Save.getSettings();

    // ── 사운드 토글 ─────────────────────────────────────
    this._toggle(150, 'BGM (배경음)', s.bgm, (on) => Audio.setBgm(on));
    this._toggle(214, 'SFX (효과음)', s.sfx, (on) => {
      Audio.setSfx(on);
      if (on) Audio.sfx('ui');
    });

    // ── 닉네임 변경 ─────────────────────────────────────
    this.add.text(40, 288, '닉네임 변경', { fontSize: '16px', color: PALETTE.serenityHex });
    this.nickInput = this.add
      .dom(GAME_WIDTH / 2, 330)
      .createFromHTML(
        `<input id="nick2" maxlength="${NICKNAME.max}" value="${escapeHtml(Save.getNickname())}"
          placeholder="2~8자" style="width:220px;padding:10px 12px;border-radius:10px;
          border:2px solid ${PALETTE.serenityHex};background:#12102a;color:#fff;font-size:15px;
          text-align:center;outline:none;" />`
      );
    this.nickMsg = this.add.text(GAME_WIDTH / 2, 362, '', { fontSize: '12px', color: PALETTE.dangerHex }).setOrigin(0.5);
    this._smallButton(GAME_WIDTH / 2, 400, '닉네임 저장', PALETTE.serenity, () => this._saveNick());

    // ── 데이터 초기화 (2단계) ────────────────────────────
    this.add.text(40, 468, '데이터 초기화', { fontSize: '16px', color: PALETTE.dangerHex });
    this.add
      .text(40, 494, '진행도·최고점수·로컬 랭킹·설정이 모두 삭제됩니다.', { fontSize: '12px', color: PALETTE.inkDim });
    this._smallButton(GAME_WIDTH / 2, 542, '초기화', PALETTE.danger, () => this._confirmReset());

    // ── 뒤로 ────────────────────────────────────────────
    this._smallButton(GAME_WIDTH / 2, GAME_HEIGHT - 70, '타이틀로', PALETTE.rose, () => {
      Audio.sfx('ui');
      this.scene.start('Title');
    });
  }

  _saveNick() {
    const raw = (document.getElementById('nick2')?.value || '').trim();
    const check = validateNickname(raw);
    if (!check.ok) {
      this.nickMsg.setColor(PALETTE.dangerHex).setText(
        check.reason === 'banned' ? '사용할 수 없는 닉네임이야.' : `${NICKNAME.min}~${NICKNAME.max}자로 입력해줘!`
      );
      return;
    }
    Save.setNickname(raw);
    this.registry.set('nickname', raw);
    Audio.sfx('powerup');
    this.nickMsg.setColor(PALETTE.serenityHex).setText('저장됐어!');
  }

  _confirmReset() {
    Audio.sfx('ui');
    const overlay = this.add.container(0, 0).setDepth(50);
    overlay.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setOrigin(0).setInteractive());
    const panelY = GAME_HEIGHT / 2;
    const g = this.add.graphics();
    g.fillStyle(PALETTE.panel, 1);
    g.lineStyle(2, PALETTE.danger, 1);
    g.fillRoundedRect(50, panelY - 90, GAME_WIDTH - 100, 180, 14);
    g.strokeRoundedRect(50, panelY - 90, GAME_WIDTH - 100, 180, 14);
    overlay.add(g);
    overlay.add(
      this.add
        .text(GAME_WIDTH / 2, panelY - 50, '정말 초기화할까요?', { fontSize: '18px', color: PALETTE.ink, fontStyle: 'bold' })
        .setOrigin(0.5)
    );
    overlay.add(
      this.add
        .text(GAME_WIDTH / 2, panelY - 16, '이 작업은 되돌릴 수 없어요.', { fontSize: '13px', color: PALETTE.inkDim })
        .setOrigin(0.5)
    );
    const yes = this._smallButton(GAME_WIDTH / 2 - 74, panelY + 44, '삭제', PALETTE.danger, () => {
      Save.resetAll();
      this.registry.remove('nickname');
      Audio.sfx('gameover');
      overlay.destroy();
      this.scene.restart();
    });
    const no = this._smallButton(GAME_WIDTH / 2 + 74, panelY + 44, '취소', PALETTE.serenity, () => {
      Audio.sfx('ui');
      overlay.destroy();
    });
    overlay.add(yes);
    overlay.add(no);
  }

  // ── UI 헬퍼 ─────────────────────────────────────────────
  _toggle(y, label, initial, onChange) {
    this.add.text(40, y, label, { fontSize: '17px', color: PALETTE.ink }).setOrigin(0, 0.5);
    let on = initial;
    const x = GAME_WIDTH - 90;
    const w = 64;
    const h = 30;
    const bg = this.add.graphics();
    const knob = this.add.circle(0, y, 12, 0xffffff);
    const draw = () => {
      bg.clear();
      bg.fillStyle(on ? PALETTE.serenity : 0x3a3550, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
      knob.x = on ? x + w / 2 - 15 : x - w / 2 + 15;
    };
    draw();
    const zone = this.add.zone(x, y, w + 20, h + 12).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      on = !on;
      draw();
      onChange(on);
    });
    return { get: () => on };
  }

  _smallButton(x, y, label, color, cb) {
    const container = this.add.container(x, y);
    const w = 130;
    const h = 44;
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    const t = this.add.text(0, 0, label, { fontSize: '17px', color: '#1a1420', fontStyle: 'bold' }).setOrigin(0.5);
    const zone = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => g.setAlpha(0.85));
    zone.on('pointerout', () => g.setAlpha(1));
    zone.on('pointerdown', cb);
    container.add([g, t, zone]);
    return container;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
