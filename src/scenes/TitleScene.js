import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PALETTE,
  LUCKY,
  NICKNAME,
  GAME_TITLE,
  GAME_SUBTITLE,
} from '../config/constants.js';
import { Save } from '../systems/SaveSystem.js';
import { validateNickname } from '../systems/Filter.js';
import { Audio } from '../systems/Audio.js';

// 타이틀 (§2.6 첫인상 노출 · §11 메뉴: 시작/랭킹/설정)
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this._starfield();

    // 로고 (제목 상수화 — T2 확정 시 constants.js만 교체)
    this.add.text(GAME_WIDTH / 2, 128, GAME_TITLE, { fontSize: '48px', fontStyle: 'bold', color: PALETTE.ink }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 176, GAME_SUBTITLE, { fontSize: '24px', color: PALETTE.roseHex }).setOrigin(0.5);

    this._diaCrystal(GAME_WIDTH / 2, 258);
    this.add
      .text(GAME_WIDTH / 2, 322, '13인의 수호자와 함께, 빛을 지켜라', { fontSize: '15px', color: PALETTE.inkDim })
      .setOrigin(0.5);

    // 닉네임 입력 (프롤로그 진입 전 최초 1회, §3.1 / D21)
    this.add.text(GAME_WIDTH / 2, 372, '랭킹 닉네임', { fontSize: '14px', color: PALETTE.serenityHex }).setOrigin(0.5);
    const existing = Save.getNickname();
    this.domInput = this.add
      .dom(GAME_WIDTH / 2, 406)
      .createFromHTML(
        `<input id="nick" maxlength="${NICKNAME.max}" value="${escapeHtml(existing)}"
          placeholder="최애를 부르듯 2~8자" style="
          width:240px;padding:12px 14px;border-radius:12px;border:2px solid ${PALETTE.serenityHex};
          background:#12102a;color:#fff;font-size:16px;text-align:center;outline:none;" />`
      );
    this.warn = this.add.text(GAME_WIDTH / 2, 440, '', { fontSize: '13px', color: PALETTE.dangerHex }).setOrigin(0.5);

    // 메뉴 (§11)
    this._button(GAME_WIDTH / 2, 500, '게임 시작', () => this._start(), { primary: true });
    this._button(GAME_WIDTH / 2, 562, '랭킹 보기', () => {
      Audio.unlock();
      Audio.sfx('ui');
      this.scene.start('Ranking', { viewOnly: true });
    });
    this._button(GAME_WIDTH / 2, 624, '설정', () => {
      Audio.unlock();
      Audio.sfx('ui');
      this.scene.start('Settings');
    });

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 54, '드래그로 이동 · 발사는 자동 · 잔기 3', {
        fontSize: '12px',
        color: PALETTE.inkDim,
        align: 'center',
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH - 12, GAME_HEIGHT - 14, `OPEN ${LUCKY.ticketHour}:00`, { fontSize: '11px', color: PALETTE.inkDim })
      .setOrigin(1);
  }

  _start() {
    Audio.unlock(); // 브라우저 자동재생 정책 — 사용자 제스처에서 오디오 활성화
    const el = document.getElementById('nick');
    const raw = (el?.value || '').trim();
    const check = validateNickname(raw);
    if (!check.ok) {
      Audio.sfx('playerHit');
      this.warn.setText(
        check.reason === 'banned' ? '사용할 수 없는 닉네임이야.' : `닉네임은 ${NICKNAME.min}~${NICKNAME.max}자로 입력해줘!`
      );
      return;
    }
    Audio.sfx('ui');
    const name = Save.setNickname(raw);
    this.registry.set('nickname', name);
    // 프롤로그는 매번 재생 — 스토리 몰입 유지. 건너뛰기는 프롤로그 내 SKIP 버튼으로만.
    this.scene.start('Prologue');
  }

  // ── 연출 헬퍼 ────────────────────────────────────────────
  _starfield() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.deep).setOrigin(0);
    for (let i = 0; i < 80; i++) {
      const s = this.add.image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT), 'star');
      s.setScale(Phaser.Math.Between(1, 3)).setAlpha(Phaser.Math.FloatBetween(0.2, 0.9));
      s.setTint(i % 2 ? PALETTE.rose : PALETTE.serenity);
      this.tweens.add({ targets: s, alpha: 0.1, duration: Phaser.Math.Between(800, 2200), yoyo: true, repeat: -1 });
    }
  }

  _diaCrystal(x, y) {
    const g = this.add.graphics();
    g.fillStyle(PALETTE.serenity, 0.9);
    g.fillTriangle(x, y - 30, x - 26, y - 5, x + 26, y - 5);
    g.fillStyle(PALETTE.rose, 0.95);
    g.fillTriangle(x - 26, y - 5, x + 26, y - 5, x, y + 30);
    g.lineStyle(2, 0xffffff, 0.8);
    g.strokeTriangle(x, y - 30, x - 26, y - 5, x + 26, y - 5);
    g.strokeTriangle(x - 26, y - 5, x + 26, y - 5, x, y + 30);
    this.tweens.add({ targets: g, alpha: 0.6, duration: 1400, yoyo: true, repeat: -1 });
  }

  _button(x, y, label, cb, opts = {}) {
    const w = opts.primary ? 220 : 190;
    const h = opts.primary ? 56 : 46;
    const fill = opts.primary ? PALETTE.rose : PALETTE.panel;
    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    if (!opts.primary) {
      g.lineStyle(2, PALETTE.serenity, 0.9);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    }
    this.add
      .text(x, y, label, {
        fontSize: opts.primary ? '22px' : '18px',
        color: opts.primary ? '#2a1a2a' : PALETTE.ink,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => g.setAlpha(0.85));
    zone.on('pointerout', () => g.setAlpha(1));
    zone.on('pointerdown', cb);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
