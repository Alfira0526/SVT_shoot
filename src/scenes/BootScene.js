import Phaser from 'phaser';
import { PALETTE } from '../config/constants.js';

// 임시 도형 에셋 생성 (§9-2) — 프로그램적으로 텍스처를 만들어 외부 파일 의존 제거.
// 도트 에셋 완성 시(§9-5) load 로 교체하면 됨.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this._transparent('__none');
    this._makeBullets();
    this._makePlayer();
    this._makeEnemies();
    this._makeBosses();
    this._makeItems();
    this._makeFx();
    this._makeQueueNumber();
    this._makePortraits();

    this.scene.start('Title');
  }

  // ── 유틸 ────────────────────────────────────────────────
  _g() {
    return this.make.graphics({ x: 0, y: 0, add: false });
  }

  _transparent(key) {
    const g = this._g();
    g.fillStyle(0xffffff, 0);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture(key, 2, 2);
    g.destroy();
  }

  // ── 탄환 ────────────────────────────────────────────────
  _makeBullets() {
    let g = this._g();
    // 플레이어탄: 빛 캡슐
    g.fillStyle(PALETTE.light, 1);
    g.fillRoundedRect(1, 0, 6, 16, 3);
    g.fillStyle(0xffffff, 0.9);
    g.fillRoundedRect(2, 2, 4, 6, 2);
    g.generateTexture('bullet_player', 8, 16);
    g.destroy();

    g = this._g();
    // 적탄: 위험색 구슬
    g.fillStyle(PALETTE.danger, 1);
    g.fillCircle(5, 5, 5);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(3.5, 3.5, 1.8);
    g.generateTexture('bullet_enemy', 10, 10);
    g.destroy();
  }

  // ── 플레이어 (응원봉 든 팬 실루엣) ────────────────────────
  _makePlayer() {
    const g = this._g();
    // 몸체
    g.fillStyle(PALETTE.serenity, 1);
    g.fillTriangle(16, 2, 4, 28, 28, 28);
    g.fillStyle(PALETTE.rose, 1);
    g.fillRoundedRect(12, 18, 8, 12, 3);
    // 응원봉 빛
    g.fillStyle(PALETTE.light, 1);
    g.fillCircle(16, 8, 4);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(16, 8, 2);
    g.generateTexture('player_ship', 32, 32);
    g.destroy();
  }

  // ── 잡몹 3종 ─────────────────────────────────────────────
  _makeEnemies() {
    // macro: 소형 로봇
    let g = this._g();
    g.fillStyle(0x8b93b8, 1);
    g.fillRoundedRect(6, 6, 20, 16, 4);
    g.fillStyle(PALETTE.danger, 1);
    g.fillCircle(12, 14, 2.5);
    g.fillCircle(20, 14, 2.5);
    g.fillStyle(0x5a6180, 1);
    g.fillRect(10, 2, 3, 6);
    g.fillRect(19, 2, 3, 6);
    g.generateTexture('enemy_macro', 32, 32);
    g.destroy();

    // spinner: 회전 스피너
    g = this._g();
    g.lineStyle(4, PALETTE.rose, 1);
    g.strokeCircle(16, 16, 11);
    g.lineStyle(4, 0xffffff, 0.5);
    g.beginPath();
    g.arc(16, 16, 11, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(120));
    g.strokePath();
    g.generateTexture('enemy_spinner', 32, 32);
    g.destroy();

    // popup: "일시적인 오류입니다" 팝업창
    g = this._g();
    g.fillStyle(0xecebf2, 1);
    g.fillRoundedRect(2, 4, 28, 24, 3);
    g.fillStyle(0xc0392b, 1);
    g.fillRect(2, 4, 28, 7);
    g.fillStyle(0x2a2a3a, 1);
    g.fillRect(7, 16, 18, 2);
    g.fillRect(7, 20, 12, 2);
    g.generateTexture('enemy_popup', 32, 32);
    g.destroy();
  }

  // ── 보스 2종 ─────────────────────────────────────────────
  _makeBosses() {
    // server: 거대 서버랙
    let g = this._g();
    g.fillStyle(0x2b2f45, 1);
    g.fillRoundedRect(8, 6, 80, 84, 8);
    g.fillStyle(0x1a1d2e, 1);
    for (let r = 0; r < 5; r++) {
      g.fillRoundedRect(16, 14 + r * 15, 64, 11, 3);
    }
    // 상태 LED
    for (let r = 0; r < 5; r++) {
      g.fillStyle(r % 2 ? PALETTE.danger : 0x4be08a, 1);
      g.fillCircle(24, 19 + r * 15, 2.5);
      g.fillStyle(PALETTE.serenity, 1);
      g.fillCircle(32, 19 + r * 15, 2.5);
    }
    g.generateTexture('boss_server', 96, 96);
    g.destroy();

    // noise: 글리치 덩어리
    g = this._g();
    g.fillStyle(0x39304f, 1);
    g.fillRoundedRect(6, 10, 68, 60, 16);
    g.fillStyle(PALETTE.danger, 0.85);
    for (let i = 0; i < 7; i++) {
      const y = 16 + i * 8;
      g.fillRect(8 + (i % 3) * 6, y, 60 - (i % 4) * 10, 3);
    }
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(28, 36, 4);
    g.fillCircle(50, 36, 4);
    g.generateTexture('boss_noise', 80, 80);
    g.destroy();
  }

  // ── 아이템 3종 ───────────────────────────────────────────
  _makeItems() {
    // wand: 응원봉 (오리지널 형태 — 공식 굿즈 복제 금지, §3.6)
    let g = this._g();
    g.fillStyle(0xffffff, 1);
    g.fillRect(10, 12, 4, 12);
    g.fillStyle(PALETTE.rose, 1);
    g.fillCircle(12, 8, 7);
    g.fillStyle(PALETTE.light, 1);
    g.fillCircle(12, 8, 4);
    g.generateTexture('item_wand', 24, 26);
    g.destroy();

    // seed: 민들레 꽃씨
    g = this._g();
    g.fillStyle(0xffffff, 0.9);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      g.fillCircle(12 + Math.cos(a) * 8, 12 + Math.sin(a) * 8, 2);
    }
    g.fillStyle(PALETTE.gold, 1);
    g.fillCircle(12, 12, 3);
    g.generateTexture('item_seed', 24, 24);
    g.destroy();

    // shield: 단결 실드
    g = this._g();
    g.lineStyle(3, PALETTE.serenity, 1);
    g.strokeCircle(12, 12, 9);
    g.fillStyle(PALETTE.serenity, 0.3);
    g.fillCircle(12, 12, 9);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(12, 12, 3);
    g.generateTexture('item_shield', 24, 24);
    g.destroy();
  }

  // ── FX: 폭발 파티클/별 ───────────────────────────────────
  _makeFx() {
    let g = this._g();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('spark', 8, 8);
    g.destroy();

    g = this._g();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture('star', 2, 2);
    g.destroy();
  }

  // ── 중간패턴: 대기열 숫자 (999,999) ──────────────────────
  _makeQueueNumber() {
    const txt = this.add.text(0, 0, '999,999', {
      fontSize: '30px',
      fontStyle: 'bold',
      color: PALETTE.dangerHex,
      stroke: '#000000',
      strokeThickness: 4,
    });
    const w = Math.ceil(txt.width) + 4;
    const h = Math.ceil(txt.height) + 4;
    const rt = this.make.renderTexture({ x: 0, y: 0, width: w, height: h, add: false });
    rt.draw(txt, 2, 2);
    rt.saveTexture('queue_number');
    txt.destroy();
    rt.destroy();
  }

  // ── 초상화 (오리지널 심볼릭 디자인) ──────────────────────
  _makePortraits() {
    // 봉이: 빛의 요정 (응원봉 오브 + 날개)
    let g = this._g();
    g.fillStyle(PALETTE.panel, 1);
    g.fillRoundedRect(0, 0, 110, 120, 12);
    g.fillStyle(0xffffff, 0.85);
    g.fillTriangle(30, 60, 8, 40, 12, 78); // 왼 날개
    g.fillTriangle(80, 60, 102, 40, 98, 78); // 오른 날개
    g.fillStyle(PALETTE.rose, 1);
    g.fillCircle(55, 58, 26);
    g.fillStyle(PALETTE.light, 1);
    g.fillCircle(55, 58, 16);
    g.fillStyle(0x2a2a3a, 1);
    g.fillCircle(48, 55, 3);
    g.fillCircle(62, 55, 3);
    g.fillStyle(0x2a2a3a, 1);
    g.fillRoundedRect(50, 64, 10, 3, 2);
    g.generateTexture('pt_bongi', 110, 120);
    g.destroy();

    // 플레이어: 응원봉 든 팬
    g = this._g();
    g.fillStyle(PALETTE.panel, 1);
    g.fillRoundedRect(0, 0, 110, 120, 12);
    g.fillStyle(PALETTE.serenity, 1);
    g.fillCircle(55, 46, 22);
    g.fillStyle(PALETTE.rose, 1);
    g.fillRoundedRect(34, 68, 42, 44, 10);
    g.fillStyle(PALETTE.light, 1); // 응원봉
    g.fillRect(82, 40, 5, 40);
    g.fillCircle(84, 36, 7);
    g.fillStyle(0x2a2a3a, 1);
    g.fillCircle(48, 46, 3);
    g.fillCircle(62, 46, 3);
    g.generateTexture('pt_player', 110, 120);
    g.destroy();

    // 노이즈: 글리치 얼굴
    g = this._g();
    g.fillStyle(PALETTE.panel, 1);
    g.fillRoundedRect(0, 0, 110, 120, 12);
    g.fillStyle(0x39304f, 1);
    g.fillRoundedRect(18, 24, 74, 74, 14);
    g.fillStyle(PALETTE.danger, 0.9);
    for (let i = 0; i < 6; i++) g.fillRect(22, 34 + i * 10, 66 - (i % 3) * 12, 3);
    g.fillStyle(0xffffff, 1);
    g.fillRect(38, 52, 10, 10);
    g.fillRect(64, 52, 10, 10);
    g.generateTexture('pt_noise', 110, 120);
    g.destroy();

    // 티켓팅 서버: 서버 얼굴
    g = this._g();
    g.fillStyle(PALETTE.panel, 1);
    g.fillRoundedRect(0, 0, 110, 120, 12);
    g.fillStyle(0x2b2f45, 1);
    g.fillRoundedRect(20, 20, 70, 82, 10);
    g.fillStyle(0x4be08a, 1);
    g.fillCircle(38, 44, 5);
    g.fillStyle(PALETTE.danger, 1);
    g.fillCircle(72, 44, 5);
    g.fillStyle(0x1a1d2e, 1);
    g.fillRoundedRect(30, 66, 50, 8, 3);
    g.fillRoundedRect(30, 80, 50, 8, 3);
    g.generateTexture('pt_server', 110, 120);
    g.destroy();
  }
}
