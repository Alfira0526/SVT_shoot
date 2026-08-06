import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PALETTE,
  LUCKY,
  NICKNAME,
  GAME_TITLE,
  GAME_SUBTITLE,
  DEV_PASSWORD,
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

    // 메뉴 (§11) — 스토리(캠페인) / 엔들리스(무한 성장) 2모드
    this._button(GAME_WIDTH / 2, 492, '스토리 모드', () => this._startStory(), { primary: true });
    this._button(GAME_WIDTH / 2, 548, '엔들리스 모드', () => this._startEndless(), { accent: true });
    this._button(GAME_WIDTH / 2, 602, '랭킹 보기', () => {
      Audio.unlock();
      Audio.sfx('ui');
      this.scene.start('Ranking', { viewOnly: true });
    });
    this._button(GAME_WIDTH / 2, 654, '설정', () => {
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

    // ── QA 개발자 모드 (숨김 버튼 + 패스워드) ──────────────
    this.registry.set('devMode', Save.getDev()); // GameScene 이 참조
    // 좌하단 코너 투명 버튼 (보이지 않음 — 아는 사람만 탭)
    this.add
      .zone(0, GAME_HEIGHT - 46, 54, 46)
      .setOrigin(0)
      .setInteractive({ useHandCursor: false })
      .on('pointerdown', () => this._openDevPrompt());
    this._devBadge = this.add
      .text(12, 12, 'DEV ∞', { fontSize: '12px', color: PALETTE.goldHex, fontStyle: 'bold' })
      .setDepth(15)
      .setVisible(Save.getDev());
  }

  // ── 개발자 모드 패스워드 오버레이 ────────────────────────
  _openDevPrompt() {
    if (this._devOverlay) return;
    Audio.unlock();
    Audio.sfx('ui');
    this.domInput?.setVisible(false); // 닉네임 DOM 입력 숨김 (딤 위로 뜨는 것 방지)
    const c = this.add.container(0, 0).setDepth(60);
    const py = 288;
    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.74).setOrigin(0).setInteractive();
    const g = this.add.graphics();
    g.fillStyle(PALETTE.panel, 1);
    g.fillRoundedRect(56, py, GAME_WIDTH - 112, 226, 16);
    g.lineStyle(2, PALETTE.gold, 0.9);
    g.strokeRoundedRect(56, py, GAME_WIDTH - 112, 226, 16);
    const on = Save.getDev();
    const title = this.add.text(GAME_WIDTH / 2, py + 30, '🔒 개발자 모드 (QA)', { fontSize: '20px', color: PALETTE.goldHex, fontStyle: 'bold' }).setOrigin(0.5);
    const sub = this.add.text(GAME_WIDTH / 2, py + 58, on ? '현재 ON · 무제한 라이프 (끄려면 패스워드)' : '패스워드 입력 → 무제한 라이프', { fontSize: '13px', color: PALETTE.inkDim }).setOrigin(0.5);
    const dom = this.add
      .dom(GAME_WIDTH / 2, py + 104)
      .createFromHTML(
        `<input id="devpw" type="password" autocomplete="off" placeholder="password" style="
          width:200px;padding:11px 12px;border-radius:10px;border:2px solid ${PALETTE.goldHex};
          background:#12102a;color:#fff;font-size:16px;text-align:center;outline:none;" />`
      );
    const warn = this.add.text(GAME_WIDTH / 2, py + 138, '', { fontSize: '12px', color: PALETTE.dangerHex }).setOrigin(0.5);
    // 베이스(딤·패널·텍스트)를 먼저 넣어 버튼이 위에 오도록 — 딤이 버튼 탭을 가로채지 않게
    c.add([dim, g, title, sub, dom, warn]);

    const btn = (x, label, fill, ink, cb) => {
      const w = 110, h = 46, by = py + 176;
      const bg = this.add.graphics();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(x - w / 2, by - h / 2, w, h, 12);
      const t = this.add.text(x, by, label, { fontSize: '17px', color: ink, fontStyle: 'bold' }).setOrigin(0.5);
      const z = this.add.zone(x, by, w, h).setInteractive({ useHandCursor: true }).on('pointerdown', (p, lx, ly, ev) => { ev?.stopPropagation?.(); cb(); });
      c.add([bg, t, z]);
    };

    const close = () => {
      c.destroy();
      this._devOverlay = null;
      this.domInput?.setVisible(true);
    };
    const submit = () => {
      const el = document.getElementById('devpw');
      const val = (el?.value || '').trim();
      if (val !== DEV_PASSWORD) {
        Audio.sfx('playerHit');
        warn.setText('패스워드가 틀렸어.');
        this.cameras.main.shake(160, 0.006);
        if (el) el.value = '';
        return;
      }
      const next = !Save.getDev();
      Save.setDev(next);
      this.registry.set('devMode', next);
      this._devBadge.setVisible(next);
      Audio.sfx('powerup');
      close();
      this._toast(next ? '개발자 모드 ON · 무제한 라이프' : '개발자 모드 OFF');
    };

    btn(GAME_WIDTH / 2 - 62, '취소', PALETTE.panel, PALETTE.ink, close);
    btn(GAME_WIDTH / 2 + 62, '확인', PALETTE.gold, '#2a1a12', submit);
    this._devOverlay = c;
  }

  _toast(msg) {
    const t = this.add
      .text(GAME_WIDTH / 2, 120, msg, {
        fontSize: '15px', color: PALETTE.ink, fontStyle: 'bold',
        backgroundColor: 'rgba(22,19,39,0.92)', padding: { x: 14, y: 9 },
      })
      .setOrigin(0.5)
      .setDepth(70);
    this.tweens.add({ targets: t, alpha: 0, y: 96, duration: 1600, delay: 900, onComplete: () => t.destroy() });
  }

  // 닉네임 검증 후 저장·registry 반영 → 성공 시 name, 실패 시 null(경고 표시)
  _resolveNick() {
    Audio.unlock(); // 브라우저 자동재생 정책 — 사용자 제스처에서 오디오 활성화
    const el = document.getElementById('nick');
    const raw = (el?.value || '').trim();
    const check = validateNickname(raw);
    if (!check.ok) {
      Audio.sfx('playerHit');
      this.warn.setText(
        check.reason === 'banned' ? '사용할 수 없는 닉네임이야.' : `닉네임은 ${NICKNAME.min}~${NICKNAME.max}자로 입력해줘!`
      );
      return null;
    }
    const name = Save.setNickname(raw);
    this.registry.set('nickname', name);
    return name;
  }

  _startStory() {
    if (this._resolveNick() == null) return;
    Audio.sfx('ui');
    // 프롤로그는 매번 재생 — 스토리 몰입 유지. 건너뛰기는 프롤로그 내 SKIP 버튼으로만.
    this.scene.start('Prologue');
  }

  _startEndless() {
    if (this._resolveNick() == null) return;
    Audio.sfx('ui');
    this.scene.start('Endless');
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
    const big = opts.primary || opts.accent;
    const w = big ? 220 : 190;
    const h = big ? 56 : 46;
    const fill = opts.primary ? PALETTE.rose : opts.accent ? PALETTE.serenity : PALETTE.panel;
    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    if (!big) {
      g.lineStyle(2, PALETTE.serenity, 0.9);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    }
    this.add
      .text(x, y, label, {
        fontSize: big ? '22px' : '18px',
        color: big ? '#1a2230' : PALETTE.ink,
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
