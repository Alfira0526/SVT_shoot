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
      'boss_noise', 'boss_scalper', 'boss_server', 'boss_monopolist', // 자체 도트(Pillow) 교체
      'coin', // 엔들리스 별조각
    ];
    sprites.forEach((n) => this.load.image(n, `assets/sprites/${n}.png`));
    // 수호자 히어로(장착색 × 진화 3단계: 각성/성장/만개)
    ['rose', 'serenity', 'gold', 'mint', 'lavender'].forEach((c) => {
      this.load.image(`hero_${c}`, `assets/sprites/hero_${c}.png`);
      this.load.image(`hero_${c}_2`, `assets/sprites/hero_${c}_2.png`);
      this.load.image(`hero_${c}_3`, `assets/sprites/hero_${c}_3.png`);
    });
    // 컷씬(D31) — 텍스처 키를 dialogue JSON 의 image 값과 동일하게
    ['c1_concert', 'c2_booth', 'c3_reveal', 'c4_accident', 'c5_wand']
      .forEach((n) => this.load.image(`cutscenes/${n}.png`, `assets/cutscenes/${n}.png`));
    this.load.image('card_back', 'assets/cutscenes/card_back.png');
    // W3 암표 총책 초상화(D34 — v2 선반영, 감정곡선 sell/smug/crack)
    ['sell', 'smug', 'crack'].forEach((e) => this.load.image(`pt_scalper_${e}`, `assets/portraits/pt_scalper_${e}.png`));
    // 자체 일러스트 버스트(Pillow) — 수호자 4종 + 적/플레이어 (Graphics 도형 대체)
    [
      // 14정령 v2 — 루멘(bongi) + 팬덤 경험 정령 13
      'pt_g_bongi', 'pt_g_pollin', 'pt_g_pick', 'pt_g_saerok', 'pt_g_bitjang', 'pt_g_ulrim', 'pt_g_semi',
      'pt_g_yeongsu', 'pt_g_chalna', 'pt_g_diwon', 'pt_g_nesi', 'pt_g_yeobaek', 'pt_g_seupjak', 'pt_g_janbul',
      'pt_player', 'pt_noise', 'pt_server', 'pt_monopolist',
    ].forEach((n) => this.load.image(n, `assets/portraits/${n}.png`));
  }

  create() {
    // 모바일: 롱프레스 컨텍스트 메뉴 억제 (오조작·선택 방지)
    this.input.mouse?.disableContextMenu();

    this._transparent('__none');
    // 보스/별조각은 자체 도트(Pillow)로 교체 — Graphics 생성 제거
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

  // ── 초상화 ───────────────────────────────────────────────
  _makePortraits() {
    // 봉이 색 배리언트/스프라이트(폴백·인게임용) 유지.
    // 대사·도감 버스트는 자체 일러스트 PNG(pt_g_*, pt_player/noise/server/monopolist)를 로드해 사용.
    makeBongiPortraits(this);
  }
}
