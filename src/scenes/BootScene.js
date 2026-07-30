import Phaser from 'phaser';
import { PALETTE } from '../config/constants.js';
import { makeBongiPortraits } from '../entities/BongiPortrait.js';

// 에셋 로딩·생성 (§9-2/§9-5) — 완성 도트 스프라이트/컷씬/초상화는 load, 미제작분은 Graphics 생성.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // 도트 스프라이트(§9-5 교체 완료분) — 크기는 논리 규격 1:1
    const sprites = [
      'player_ship', 'enemy_macro', 'enemy_spinner', 'enemy_popup',
      'w3_macro', 'w3_spinner', 'w3_popup', // W3 잡몹 팔레트 스왑 스킨 (D34)
      'item_wand', 'item_seed', 'item_shield', 'bullet_player', 'bullet_enemy',
      'boss_noise', 'boss_scalper',
    ];
    sprites.forEach((n) => this.load.image(n, `assets/sprites/${n}.png`));
    // 컷씬(D31) — 텍스처 키를 dialogue JSON 의 image 값과 동일하게
    ['c1_concert', 'c2_booth', 'c3_reveal', 'c4_accident', 'c5_wand']
      .forEach((n) => this.load.image(`cutscenes/${n}.png`, `assets/cutscenes/${n}.png`));
    this.load.image('card_back', 'assets/cutscenes/card_back.png');
    // W3 암표 총책 초상화(D34 — v2 선반영, 감정곡선 sell/smug/crack)
    ['sell', 'smug', 'crack'].forEach((e) => this.load.image(`pt_scalper_${e}`, `assets/portraits/pt_scalper_${e}.png`));
  }

  create() {
    // 모바일: 롱프레스 컨텍스트 메뉴 억제 (오조작·선택 방지)
    this.input.mouse?.disableContextMenu();

    this._transparent('__none');
    this._makeBossServer(); // boss_server 96×96 은 도트 미제작 — Graphics 유지
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

  // ── 보스: 서버랙 (96×96 도트 미제작 — Graphics 유지) ─────
  _makeBossServer() {
    const g = this._g();
    g.fillStyle(0x2b2f45, 1);
    g.fillRoundedRect(8, 6, 80, 84, 8);
    g.fillStyle(0x1a1d2e, 1);
    for (let r = 0; r < 5; r++) {
      g.fillRoundedRect(16, 14 + r * 15, 64, 11, 3);
    }
    // 상태 LED
    for (let r = 0; r < 5; r++) {
      g.fillStyle(r % 2 ? PALETTE.danger : PALETTE.ok, 1);
      g.fillCircle(24, 19 + r * 15, 2.5);
      g.fillStyle(PALETTE.serenity, 1);
      g.fillCircle(32, 19 + r * 15, 2.5);
    }
    g.generateTexture('boss_server', 96, 96);
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
    // 봉이 v2 — 둥근 정령형 초상화(표정·색 배리언트 포함). pt_bongi 키 그대로 생성.
    makeBongiPortraits(this);

    // 플레이어: 응원봉 든 팬
    let g = this._g();
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
