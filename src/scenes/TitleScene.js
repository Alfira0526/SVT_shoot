import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE, LUCKY, NICKNAME } from '../config/constants.js';
import { Save } from '../systems/SaveSystem.js';
import { validateNickname } from '../systems/Filter.js';

// 타이틀 (§2.6 — 노출 가능 요소를 첫인상에 배치: 색·숫자 13·DIA·일반용어)
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this._starfield();

    // 타이틀 로고
    this.add
      .text(GAME_WIDTH / 2, 150, '빛의 세계', {
        fontSize: '48px',
        fontStyle: 'bold',
        color: PALETTE.ink,
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 200, 'D I A', {
        fontSize: '26px',
        color: PALETTE.roseHex,
        letterSpacing: 8,
      })
      .setOrigin(0.5);

    // DIA 결정 모티브 (보석) + 13 숫자
    this._diaCrystal(GAME_WIDTH / 2, 290);
    this.add
      .text(GAME_WIDTH / 2, 356, `13인의 수호자와 함께, 빛을 지켜라`, {
        fontSize: '15px',
        color: PALETTE.inkDim,
      })
      .setOrigin(0.5);

    // 닉네임 입력 (프롤로그 진입 전 최초 1회, §3.1 / D21)
    this.add
      .text(GAME_WIDTH / 2, 440, '랭킹 닉네임', { fontSize: '14px', color: PALETTE.serenityHex })
      .setOrigin(0.5);

    const existing = Save.getNickname();
    this.domInput = this.add
      .dom(GAME_WIDTH / 2, 476)
      .createFromHTML(
        `<input id="nick" maxlength="${NICKNAME.max}" value="${escapeHtml(existing)}"
          placeholder="최애를 부르듯 2~8자" style="
          width:240px;padding:12px 14px;border-radius:12px;border:2px solid ${PALETTE.serenityHex};
          background:#12102a;color:#fff;font-size:16px;text-align:center;outline:none;" />`
      );

    this.warn = this.add
      .text(GAME_WIDTH / 2, 512, '', { fontSize: '13px', color: PALETTE.dangerHex })
      .setOrigin(0.5);

    // 시작 버튼
    this._button(GAME_WIDTH / 2, 580, '게임 시작', () => this._start());

    // 안내
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 70, '드래그로 이동 · 발사는 자동\n잔기 3 · 컨티뉴 없음 (아케이드)', {
        fontSize: '13px',
        color: PALETTE.inkDim,
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5);

    // 팬덤 관행/숫자 이스터에그: 8:00 티켓팅
    this.add
      .text(GAME_WIDTH - 12, GAME_HEIGHT - 14, `OPEN ${LUCKY.ticketHour}:00`, {
        fontSize: '11px',
        color: PALETTE.inkDim,
      })
      .setOrigin(1);
  }

  _start() {
    const el = document.getElementById('nick');
    const raw = (el?.value || '').trim();
    const check = validateNickname(raw);
    if (!check.ok) {
      this.warn.setText(
        check.reason === 'banned'
          ? '사용할 수 없는 닉네임이야.'
          : `닉네임은 ${NICKNAME.min}~${NICKNAME.max}자로 입력해줘!`
      );
      return;
    }
    const name = Save.setNickname(raw);
    this.registry.set('nickname', name);
    this.scene.start('Prologue');
  }

  // ── 연출 헬퍼 ────────────────────────────────────────────
  _starfield() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.deep).setOrigin(0);
    for (let i = 0; i < 80; i++) {
      const s = this.add.image(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT),
        'star'
      );
      s.setScale(Phaser.Math.Between(1, 3)).setAlpha(Phaser.Math.FloatBetween(0.2, 0.9));
      s.setTint(i % 2 ? PALETTE.rose : PALETTE.serenity);
      this.tweens.add({
        targets: s,
        alpha: 0.1,
        duration: Phaser.Math.Between(800, 2200),
        yoyo: true,
        repeat: -1,
      });
    }
  }

  _diaCrystal(x, y) {
    const g = this.add.graphics();
    g.fillStyle(PALETTE.serenity, 0.9);
    g.fillTriangle(x, y - 34, x - 30, y - 6, x + 30, y - 6);
    g.fillStyle(PALETTE.rose, 0.95);
    g.fillTriangle(x - 30, y - 6, x + 30, y - 6, x, y + 34);
    g.lineStyle(2, 0xffffff, 0.8);
    g.strokeTriangle(x, y - 34, x - 30, y - 6, x + 30, y - 6);
    g.strokeTriangle(x - 30, y - 6, x + 30, y - 6, x, y + 34);
    this.tweens.add({ targets: g, alpha: 0.6, duration: 1400, yoyo: true, repeat: -1 });
  }

  _button(x, y, label, cb) {
    const w = 200;
    const h = 54;
    const g = this.add.graphics();
    g.fillStyle(PALETTE.rose, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    this.add
      .text(x, y, label, { fontSize: '22px', color: '#2a1a2a', fontStyle: 'bold' })
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
