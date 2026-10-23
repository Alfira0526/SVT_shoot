// §9 2단계 — 임시 도형 텍스처. 도트 에셋(Piskel) 완성 시 동일 키로 교체하면 됨.
// 실루엣 차별화 원칙(§5): 색을 빼도 모양만으로 적·아이템 구분 가능하게.
import Phaser from 'phaser';
import { COLORS, CSS, FONT, GAME_W, GAME_H } from '../config/constants.js';

function gfx(scene) {
  return scene.make.graphics({ x: 0, y: 0, add: false });
}

export function drawVerticalGradient(g, x, y, w, h, c1, c2, steps = 48) {
  const a = Phaser.Display.Color.ValueToColor(c1);
  const b = Phaser.Display.Color.ValueToColor(c2);
  const sh = h / steps;
  for (let i = 0; i < steps; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, steps - 1, i);
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    g.fillRect(x, y + i * sh, w, sh + 1);
  }
}

function textTexture(scene, key, text, style, w, h) {
  if (scene.textures.exists(key)) return;
  const t = scene.make.text({ x: 0, y: 0, text, style, add: false });
  const width = w || Math.ceil(t.width) + 4;
  const height = h || Math.ceil(t.height) + 4;
  const dt = scene.textures.addDynamicTexture(key, width, height);
  dt.draw(t, Math.floor((width - t.width) / 2), Math.floor((height - t.height) / 2));
  t.destroy();
}

// 오픈소스 아이콘(game-icons.net) 기반 캐릭터·아이템 텍스처. 아이콘이 로드돼 있을 때만 생성하고,
// 없으면 아래 createPlaceholderTextures()의 임시 도형이 그대로 쓰인다 (D31 폴백 원칙).
export function createIconTextures(scene) {
  const tx = scene.textures;
  const has = (k) => tx.exists(k);

  const icon = (key, size, tint, x, y, alpha = 1) => {
    const img = scene.make.image({ key, add: false });
    img.setDisplaySize(size, size).setTint(tint).setAlpha(alpha).setPosition(x, y);
    return img;
  };
  const glow = (x, y, r, color, alpha = 0.1) => {
    const g = gfx(scene);
    for (let rr = r; rr > 0; rr -= Math.max(2, r / 8)) {
      g.fillStyle(color, alpha);
      g.fillCircle(x, y, rr);
    }
    return g;
  };
  const build = (key, w, h, needIcon, fn) => {
    if (has(key) || !has(needIcon)) return;
    const dt = tx.addDynamicTexture(key, w, h);
    const objs = fn();
    objs.forEach((o) => {
      dt.draw(o);
      o.destroy();
    });
  };
  const panel = (w, h, fill, stroke) => {
    const g = gfx(scene);
    g.fillStyle(fill, 1);
    g.fillRoundedRect(0, 0, w, h, 10);
    g.lineStyle(2, stroke, 0.85);
    g.strokeRoundedRect(1, 1, w - 2, h - 2, 10);
    return g;
  };

  // 플레이어: 후드 실루엣 + 응원봉 빛
  build('player', 36, 36, 'icon_player', () => {
    const dot = gfx(scene);
    dot.fillStyle(COLORS.lemon, 1);
    dot.fillCircle(30, 7, 4.5);
    dot.fillStyle(COLORS.white, 1);
    dot.fillCircle(30, 7, 2);
    return [glow(30, 7, 9, COLORS.lemon, 0.12), icon('icon_player', 34, 0xd6c8ff, 17, 19), dot];
  });

  build('macro_bot', 30, 30, 'icon_macro_bot', () => [icon('icon_macro_bot', 28, COLORS.serenity, 15, 15)]);
  build('spinner', 32, 32, 'icon_spinner', () => [icon('icon_spinner', 30, COLORS.mint, 16, 16)]);
  build('error_popup', 48, 32, 'icon_error', () => {
    const g = gfx(scene);
    g.fillStyle(COLORS.cream, 1);
    g.fillRoundedRect(0, 0, 48, 32, 4);
    g.fillStyle(COLORS.danger, 1);
    g.fillRoundedRect(0, 0, 48, 8, { tl: 4, tr: 4, bl: 0, br: 0 });
    g.fillStyle(COLORS.white, 1);
    g.fillRect(41, 2, 4, 4);
    g.fillStyle(COLORS.gray, 1);
    g.fillRect(4, 13, 10, 2);
    g.fillRect(4, 18, 8, 2);
    g.fillRect(34, 13, 10, 2);
    g.fillRect(36, 18, 8, 2);
    return [g, icon('icon_error', 20, COLORS.coral, 24, 20)];
  });
  build('noise_mote', 28, 28, 'icon_noise', () => [icon('icon_noise', 27, COLORS.grape, 14, 14), icon('icon_noise', 14, COLORS.rose, 14, 14, 0.9)]);

  build('boss_server', 96, 96, 'icon_boss_server', () => {
    const g = gfx(scene);
    g.fillStyle(COLORS.panel, 1);
    g.fillRoundedRect(6, 0, 84, 96, 8);
    g.lineStyle(3, COLORS.serenity, 1);
    g.strokeRoundedRect(6, 0, 84, 96, 8);
    g.fillStyle(COLORS.danger, 1);
    g.fillRect(18, 91, 60, 3);
    return [g, icon('icon_boss_server', 78, COLORS.cream, 48, 47)];
  });
  build('boss_noise', 84, 84, 'icon_boss_noise', () => [
    glow(42, 42, 40, COLORS.grape, 0.08),
    icon('icon_boss_noise', 82, COLORS.rose, 42, 42),
    icon('icon_noise', 36, COLORS.grape, 42, 42, 0.95),
  ]);

  build('item_lightstick', 26, 26, 'icon_lightstick', () => [glow(13, 13, 13, COLORS.lemon, 0.1), icon('icon_lightstick', 24, COLORS.lemon, 13, 13)]);
  build('item_seed', 26, 26, 'icon_seed', () => [icon('icon_seed', 24, COLORS.white, 13, 13)]);
  build('item_shield', 26, 26, 'icon_shield', () => [icon('icon_shield', 24, COLORS.serenity, 13, 13)]);

  // 초상화 110×120 (D38 폴백 체인의 마지막 단계를 아이콘으로 대체)
  build('ph_portrait_player', 110, 120, 'icon_player', () => [
    panel(110, 120, COLORS.panel, COLORS.grape),
    glow(84, 44, 16, COLORS.lemon, 0.12),
    icon('icon_player', 88, 0x3a3566, 55, 64),
  ]);
  build('ph_portrait_bongi', 110, 120, 'icon_bongi', () => [
    panel(110, 120, COLORS.panel, COLORS.grape),
    glow(55, 60, 44, COLORS.lemon, 0.06),
    icon('icon_bongi', 86, COLORS.lemon, 55, 60),
  ]);
  build('ph_portrait_bongi_shadow', 110, 120, 'icon_bongi', () => [
    panel(110, 120, COLORS.panel, COLORS.grape),
    glow(55, 60, 46, COLORS.lemon, 0.08),
    icon('icon_bongi', 86, COLORS.ink, 55, 60, 0.95),
  ]);
  build('ph_portrait_boss_server', 110, 120, 'icon_boss_server', () => [
    panel(110, 120, COLORS.panel, COLORS.grape),
    icon('icon_boss_server', 88, COLORS.serenity, 55, 60),
  ]);
  build('ph_portrait_boss_noise', 110, 120, 'icon_boss_noise', () => [
    panel(110, 120, COLORS.panel, COLORS.grape),
    icon('icon_boss_noise', 90, COLORS.grape, 55, 60),
    icon('icon_noise', 40, COLORS.rose, 55, 60),
  ]);

  // 프롤로그 카드 (오리지널 디자인)
  build('card_back', 120, 180, 'icon_card', () => {
    const g = gfx(scene);
    g.fillStyle(COLORS.grape, 1);
    g.fillRoundedRect(0, 0, 120, 180, 12);
    g.lineStyle(4, COLORS.cream, 1);
    g.strokeRoundedRect(4, 4, 112, 172, 10);
    return [g, icon('icon_card', 72, COLORS.cream, 60, 90)];
  });
  build('card_front', 120, 180, 'icon_sparkles', () => {
    const g = gfx(scene);
    g.fillStyle(COLORS.cream, 1);
    g.fillRoundedRect(0, 0, 120, 180, 12);
    g.lineStyle(4, COLORS.gold, 1);
    g.strokeRoundedRect(4, 4, 112, 172, 10);
    g.fillStyle(COLORS.grape, 1);
    g.fillRect(30, 140, 60, 6);
    g.fillRect(40, 152, 40, 6);
    return [g, glow(60, 78, 40, COLORS.rose, 0.08), icon('icon_sparkles', 80, COLORS.rose, 60, 78)];
  });

  // 타이틀 엠블럼
  build('emblem', 180, 180, 'icon_bongi', () => [glow(90, 90, 88, COLORS.lemon, 0.05), icon('icon_bongi', 150, COLORS.lemon, 90, 90)]);
}

export function createPlaceholderTextures(scene) {
  const tx = scene.textures;
  const has = (k) => tx.exists(k);
  let g;

  if (!has('pixel')) {
    g = gfx(scene);
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture('pixel', 2, 2);
    g.destroy();
  }

  // 플레이어: 응원봉 든 팬 (후드 실루엣 + 응원봉)
  if (!has('player')) {
    g = gfx(scene);
    g.fillStyle(COLORS.grape, 1);
    g.fillRoundedRect(6, 10, 18, 20, 7); // 몸
    g.fillStyle(COLORS.panel, 1);
    g.fillCircle(15, 11, 7); // 후드 머리
    g.fillStyle(COLORS.rose, 1);
    g.fillCircle(15, 12, 3); // 얼굴 포인트
    g.fillStyle(COLORS.cream, 1);
    g.fillRect(25, 8, 3, 16); // 응원봉 막대
    g.fillStyle(COLORS.lemon, 1);
    g.fillCircle(26.5, 6, 5); // 응원봉 머리(빛)
    g.fillStyle(COLORS.white, 1);
    g.fillCircle(26.5, 6, 2);
    g.generateTexture('player', 32, 32);
    g.destroy();
  }

  if (!has('bullet_player')) {
    g = gfx(scene);
    g.fillStyle(COLORS.cream, 1);
    g.fillRoundedRect(0, 0, 6, 16, 3);
    g.fillStyle(COLORS.lemon, 1);
    g.fillRoundedRect(1.5, 2, 3, 12, 1.5);
    g.generateTexture('bullet_player', 6, 16);
    g.destroy();
  }

  if (!has('bullet_enemy')) {
    g = gfx(scene);
    g.fillStyle(COLORS.danger, 1);
    g.fillCircle(6, 6, 6);
    g.fillStyle(COLORS.white, 1);
    g.fillCircle(6, 6, 2.6);
    g.generateTexture('bullet_enemy', 12, 12);
    g.destroy();
  }

  if (!has('bullet_enemy_blue')) {
    g = gfx(scene);
    g.fillStyle(COLORS.serenity, 1);
    g.fillCircle(6, 6, 6);
    g.fillStyle(COLORS.white, 1);
    g.fillCircle(6, 6, 2.6);
    g.generateTexture('bullet_enemy_blue', 12, 12);
    g.destroy();
  }

  if (!has('bullet_enemy_noise')) {
    g = gfx(scene);
    g.fillStyle(COLORS.grape, 1);
    g.fillRect(2, 0, 8, 12);
    g.fillRect(0, 2, 12, 8);
    g.fillStyle(COLORS.rose, 1);
    g.fillRect(4, 4, 4, 4);
    g.generateTexture('bullet_enemy_noise', 12, 12);
    g.destroy();
  }

  // 중간 패턴: 999,999 숫자 탄막
  textTexture(scene, 'bullet_num', '999,999', {
    fontFamily: FONT.mono,
    fontSize: '18px',
    fontStyle: 'bold',
    color: CSS.lemon,
    stroke: CSS.ink,
    strokeThickness: 3,
  });

  // 잡몹A 매크로 봇 — 각진 로봇 + 안테나 (사각)
  if (!has('macro_bot')) {
    g = gfx(scene);
    g.fillStyle(COLORS.serenity, 1);
    g.fillRect(4, 8, 20, 18);
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(8, 13, 5, 4);
    g.fillRect(15, 13, 5, 4);
    g.fillStyle(COLORS.danger, 1);
    g.fillRect(9, 21, 10, 2);
    g.fillStyle(COLORS.cream, 1);
    g.fillRect(13, 1, 2, 7);
    g.fillCircle(14, 1.5, 2);
    g.generateTexture('macro_bot', 28, 28);
    g.destroy();
  }

  // 잡몹B 로딩 스피너 — 끊긴 링 (원형)
  if (!has('spinner')) {
    g = gfx(scene);
    g.lineStyle(5, COLORS.mint, 1);
    g.beginPath();
    g.arc(15, 15, 10, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(300), false);
    g.strokePath();
    g.fillStyle(COLORS.cream, 1);
    g.fillCircle(15 + 10 * Math.cos(Phaser.Math.DegToRad(300)), 15 + 10 * Math.sin(Phaser.Math.DegToRad(300)), 3);
    g.generateTexture('spinner', 30, 30);
    g.destroy();
  }

  // 잡몹C 오류 팝업 — 창 모양 (가로 직사각)
  if (!has('error_popup')) {
    g = gfx(scene);
    g.fillStyle(COLORS.cream, 1);
    g.fillRoundedRect(0, 0, 48, 32, 4);
    g.fillStyle(COLORS.danger, 1);
    g.fillRoundedRect(0, 0, 48, 9, { tl: 4, tr: 4, bl: 0, br: 0 });
    g.fillStyle(COLORS.white, 1);
    g.fillRect(40, 2, 5, 5);
    g.fillStyle(COLORS.coral, 1);
    g.fillTriangle(24, 12, 17, 27, 31, 27);
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(23, 17, 2, 5);
    g.fillRect(23, 23, 2, 2);
    g.fillStyle(COLORS.gray, 1);
    g.fillRect(4, 14, 10, 2);
    g.fillRect(4, 19, 8, 2);
    g.fillRect(34, 14, 10, 2);
    g.fillRect(36, 19, 8, 2);
    g.generateTexture('error_popup', 48, 32);
    g.destroy();
  }

  // W1 노이즈 — 삐죽한 덩어리
  if (!has('noise_mote')) {
    g = gfx(scene);
    g.fillStyle(COLORS.grape, 1);
    g.fillTriangle(12, 0, 24, 12, 12, 24);
    g.fillTriangle(12, 0, 0, 12, 12, 24);
    g.fillStyle(COLORS.rose, 1);
    g.fillRect(8, 8, 8, 8);
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(9, 10, 2, 2);
    g.fillRect(13, 10, 2, 2);
    g.generateTexture('noise_mote', 24, 24);
    g.destroy();
  }

  // 보스: 티켓팅 서버 (서버랙 96×96)
  if (!has('boss_server')) {
    g = gfx(scene);
    g.fillStyle(COLORS.panel, 1);
    g.fillRoundedRect(8, 0, 80, 96, 6);
    g.lineStyle(3, COLORS.serenity, 1);
    g.strokeRoundedRect(8, 0, 80, 96, 6);
    for (let r = 0; r < 6; r++) {
      const y = 8 + r * 14;
      g.fillStyle(COLORS.ink, 1);
      g.fillRect(14, y, 68, 10);
      g.fillStyle(r % 2 ? COLORS.danger : COLORS.mint, 1);
      g.fillCircle(20, y + 5, 2.5);
      g.fillStyle(COLORS.lemon, 1);
      g.fillCircle(27, y + 5, 2.5);
      g.fillStyle(COLORS.gray, 1);
      for (let k = 0; k < 6; k++) g.fillRect(36 + k * 7, y + 3, 4, 4);
    }
    g.fillStyle(COLORS.danger, 1);
    g.fillRect(20, 92, 56, 4);
    g.generateTexture('boss_server', 96, 96);
    g.destroy();
  }

  // W1 연습 보스: 소형 노이즈 (72×72)
  if (!has('boss_noise')) {
    g = gfx(scene);
    g.fillStyle(COLORS.grape, 1);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      const a2 = (Math.PI * 2 * (i + 0.5)) / 8;
      g.fillTriangle(36, 36, 36 + 36 * Math.cos(a), 36 + 36 * Math.sin(a), 36 + 22 * Math.cos(a2), 36 + 22 * Math.sin(a2));
    }
    g.fillStyle(COLORS.rose, 1);
    g.fillCircle(36, 36, 16);
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(28, 31, 5, 5);
    g.fillRect(39, 31, 5, 5);
    g.fillRect(30, 42, 12, 3);
    g.generateTexture('boss_noise', 72, 72);
    g.destroy();
  }

  // 아이템 (§3.6) — 응원봉(막대+별), 민들레 꽃씨(솜뭉치), 단결 실드(육각)
  if (!has('item_lightstick')) {
    g = gfx(scene);
    g.fillStyle(COLORS.cream, 1);
    g.fillRoundedRect(10, 9, 4, 14, 2);
    g.fillStyle(COLORS.lemon, 1);
    g.fillCircle(12, 7, 6);
    g.fillStyle(COLORS.white, 1);
    g.fillCircle(12, 7, 2.5);
    g.generateTexture('item_lightstick', 24, 24);
    g.destroy();
  }
  if (!has('item_seed')) {
    g = gfx(scene);
    g.lineStyle(2, COLORS.white, 0.9);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      g.lineBetween(12, 10, 12 + 9 * Math.cos(a), 10 + 9 * Math.sin(a));
    }
    g.fillStyle(COLORS.mint, 1);
    g.fillRect(11, 10, 2, 12);
    g.fillStyle(COLORS.cream, 1);
    g.fillCircle(12, 10, 3);
    g.generateTexture('item_seed', 24, 24);
    g.destroy();
  }
  if (!has('item_shield')) {
    g = gfx(scene);
    g.lineStyle(3, COLORS.serenity, 1);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 - Math.PI / 6;
      const x = 12 + 9 * Math.cos(a);
      const y = 12 + 9 * Math.sin(a);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.strokePath();
    g.fillStyle(COLORS.serenity, 0.5);
    g.fillCircle(12, 12, 4);
    g.generateTexture('item_shield', 24, 24);
    g.destroy();
  }

  if (!has('particle')) {
    g = gfx(scene);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();
  }
  if (!has('confetti')) {
    g = gfx(scene);
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 10, 5);
    g.generateTexture('confetti', 10, 5);
    g.destroy();
  }
  if (!has('glow')) {
    g = gfx(scene);
    for (let r = 32; r > 0; r -= 4) {
      g.fillStyle(0xffffff, 0.08);
      g.fillCircle(32, 32, r);
    }
    g.generateTexture('glow', 64, 64);
    g.destroy();
  }

  // 별 배경 (타일 스크롤용)
  if (!has('stars')) {
    g = gfx(scene);
    for (let i = 0; i < 90; i++) {
      const x = Phaser.Math.Between(0, GAME_W - 1);
      const y = Phaser.Math.Between(0, GAME_H - 1);
      const s = Math.random() < 0.2 ? 2 : 1;
      g.fillStyle([COLORS.cream, COLORS.rose, COLORS.serenity][i % 3], Phaser.Math.FloatBetween(0.25, 0.8));
      g.fillRect(x, y, s, s);
    }
    g.generateTexture('stars', GAME_W, GAME_H);
    g.destroy();
  }

  // 프롤로그 카드 (오리지널 디자인 — 공식 포카 복제 금지)
  if (!has('card_back')) {
    g = gfx(scene);
    g.fillStyle(COLORS.grape, 1);
    g.fillRoundedRect(0, 0, 120, 180, 12);
    g.lineStyle(4, COLORS.cream, 1);
    g.strokeRoundedRect(4, 4, 112, 172, 10);
    g.fillStyle(COLORS.cream, 0.9);
    g.fillTriangle(60, 56, 92, 90, 60, 124);
    g.fillTriangle(60, 56, 28, 90, 60, 124);
    g.fillStyle(COLORS.grape, 1);
    g.fillTriangle(60, 72, 78, 90, 60, 108);
    g.fillTriangle(60, 72, 42, 90, 60, 108);
    g.generateTexture('card_back', 120, 180);
    g.destroy();
  }
  if (!has('card_front')) {
    g = gfx(scene);
    g.fillStyle(COLORS.cream, 1);
    g.fillRoundedRect(0, 0, 120, 180, 12);
    g.lineStyle(4, COLORS.gold, 1);
    g.strokeRoundedRect(4, 4, 112, 172, 10);
    g.fillStyle(COLORS.rose, 0.9);
    g.fillCircle(60, 80, 34);
    g.fillStyle(COLORS.lemon, 1);
    g.fillCircle(60, 80, 14);
    g.fillStyle(COLORS.grape, 1);
    g.fillRect(30, 136, 60, 6);
    g.fillRect(40, 148, 40, 6);
    g.generateTexture('card_front', 120, 180);
    g.destroy();
  }

  // 초상화 플레이스홀더 (110×120) — D38 폴백 체인 마지막 단계
  const portrait = (key, draw) => {
    if (has(key)) return;
    const pg = gfx(scene);
    pg.fillStyle(COLORS.panel, 1);
    pg.fillRoundedRect(0, 0, 110, 120, 10);
    pg.lineStyle(2, COLORS.grape, 0.8);
    pg.strokeRoundedRect(1, 1, 108, 118, 10);
    draw(pg);
    pg.generateTexture(key, 110, 120);
    pg.destroy();
  };
  portrait('ph_portrait_bongi', (pg) => {
    pg.fillStyle(COLORS.cream, 1);
    pg.fillRoundedRect(49, 52, 12, 56, 5);
    pg.fillStyle(COLORS.lemon, 1);
    pg.fillCircle(55, 42, 22);
    pg.fillStyle(COLORS.ink, 1);
    pg.fillCircle(47, 40, 3.5);
    pg.fillCircle(63, 40, 3.5);
    pg.fillStyle(COLORS.rose, 0.8);
    pg.fillCircle(42, 48, 4);
    pg.fillCircle(68, 48, 4);
    pg.fillStyle(COLORS.gold, 1);
    pg.fillTriangle(55, 8, 60, 20, 50, 20);
    pg.fillTriangle(55, 26, 60, 14, 50, 14);
  });
  portrait('ph_portrait_bongi_shadow', (pg) => {
    pg.fillStyle(COLORS.ink, 1);
    pg.fillRoundedRect(49, 52, 12, 56, 5);
    pg.fillCircle(55, 42, 22);
    pg.fillStyle(COLORS.lemon, 0.35);
    pg.fillCircle(55, 42, 26);
  });
  portrait('ph_portrait_player', (pg) => {
    pg.fillStyle(COLORS.grape, 1);
    pg.fillRoundedRect(25, 62, 60, 58, 16);
    pg.fillStyle(COLORS.ink, 1);
    pg.fillCircle(55, 44, 26);
    pg.fillStyle(COLORS.lemon, 0.9);
    pg.fillCircle(88, 70, 7);
    pg.fillStyle(COLORS.cream, 1);
    pg.fillRect(86, 76, 4, 30);
  });
  portrait('ph_portrait_boss_server', (pg) => {
    pg.fillStyle(COLORS.ink, 1);
    pg.fillRoundedRect(28, 14, 54, 96, 4);
    for (let r = 0; r < 6; r++) {
      pg.fillStyle(r % 2 ? COLORS.danger : COLORS.mint, 1);
      pg.fillCircle(36, 24 + r * 14, 3);
      pg.fillStyle(COLORS.gray, 1);
      pg.fillRect(44, 21 + r * 14, 32, 6);
    }
  });
  portrait('ph_portrait_boss_noise', (pg) => {
    pg.fillStyle(COLORS.grape, 1);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      const a2 = (Math.PI * 2 * (i + 0.5)) / 8;
      pg.fillTriangle(55, 60, 55 + 44 * Math.cos(a), 60 + 44 * Math.sin(a), 55 + 26 * Math.cos(a2), 60 + 26 * Math.sin(a2));
    }
    pg.fillStyle(COLORS.rose, 1);
    pg.fillCircle(55, 60, 18);
    pg.fillStyle(COLORS.ink, 1);
    pg.fillRect(46, 54, 6, 6);
    pg.fillRect(58, 54, 6, 6);
  });
  portrait('ph_portrait_none', () => {});
}
