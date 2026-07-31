// 봉이 v3 — "별빛 요정" 초상화 텍스처 제너레이터 (디자인 B 확정, 2026-07)
// BootScene._makePortraits() 에서 makeBongiPortraits(this) 로 호출.
//   pt_bongi + pt_bongi_<face>(표정 5종) + pt_bongi_<color>(색 배리언트) + sprite_bongi_<color>
// 외부 이미지 없이 프로그램적 생성(§9-2) — 별 후광 + 둥근 몸 + 웃는 얼굴 + 별 안테나.

import Phaser from 'phaser';
import { PALETTE } from '../config/constants.js';

export const W = 110;
export const H = 120;

export const BONGI_COLORS = {
  rose: PALETTE.rose, // 0xf1c7d2 기본
  serenity: PALETTE.serenity, // 0x9cc1e5
  gold: PALETTE.gold, // 0xffd66b
  mint: 0x8fdcc2, // 파생
  lavender: 0xc9b8e8, // 파생
};

export const BONGI_FACES = ['neutral', 'surprise', 'smile', 'sorry', 'wink'];

const INK = 0x2a2a3a;

function mix(color, target, t) {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const d = Phaser.Display.Color.IntegerToColor(target);
  return Phaser.Display.Color.GetColor(
    c.red + (d.red - c.red) * t,
    c.green + (d.green - c.green) * t,
    c.blue + (d.blue - c.blue) * t
  );
}

// n각 별 꼭짓점 배열 (fillPoints 용)
function starPoints(cx, cy, R, r, n, rot) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const ang = rot + (i * Math.PI) / n;
    const rad = i % 2 ? r : R;
    pts.push({ x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad });
  }
  return pts;
}

function sparkle(g, x, y, s) {
  g.fillStyle(PALETTE.light, 1);
  g.fillTriangle(x, y - s * 1.4, x + s * 1.4, y, x, y + s * 1.4);
  g.fillTriangle(x, y - s * 1.4, x - s * 1.4, y, x, y + s * 1.4);
}

// 표정 (눈·입) — 몸 중심 (55,58) 기준
function face(g, expr) {
  const slit = (x) => {
    g.fillStyle(INK, 1);
    g.fillRoundedRect(x - 4, 52, 8, 16, 4);
    g.fillStyle(0xffffff, 0.95);
    g.fillRoundedRect(x - 2, 54, 3.2, 5.5, 1.6);
  };
  const round = (x, r) => {
    g.fillStyle(INK, 1);
    g.fillCircle(x, 60, r);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(x - r * 0.35, 60 - r * 0.4, r * 0.34);
  };
  const arch = (x) => {
    g.lineStyle(3.4, INK, 1);
    g.beginPath();
    g.arc(x, 64, 7, Phaser.Math.DegToRad(191), Phaser.Math.DegToRad(349));
    g.strokePath();
  };
  const smileArc = (x, r) => {
    g.lineStyle(3, INK, 1);
    g.beginPath();
    g.arc(x, 70, r, Phaser.Math.DegToRad(27), Phaser.Math.DegToRad(153));
    g.strokePath();
  };

  if (expr === 'neutral') {
    slit(43); slit(67); smileArc(55, 5);
  } else if (expr === 'surprise') {
    round(43, 8); round(67, 8);
    g.fillStyle(INK, 1);
    g.fillEllipse(55, 76, 8.4, 10.4);
  } else if (expr === 'smile') {
    arch(43); arch(67);
    g.fillStyle(INK, 1);
    g.slice(55, 69, 7, Phaser.Math.DegToRad(7), Phaser.Math.DegToRad(173));
    g.fillPath();
    g.fillStyle(PALETTE.danger, 1);
    g.slice(55, 75, 3.2, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360));
    g.fillPath();
  } else if (expr === 'sorry') {
    g.fillStyle(INK, 1);
    g.fillRoundedRect(39, 56, 8, 12, 4);
    g.fillRoundedRect(63, 56, 8, 12, 4);
    g.fillStyle(0xffffff, 0.95);
    g.fillRoundedRect(41, 58, 3.2, 4, 1.6);
    g.fillRoundedRect(65, 58, 3.2, 4, 1.6);
    g.lineStyle(3, INK, 1);
    g.beginPath();
    g.moveTo(49, 73); g.lineTo(55, 69); g.lineTo(61, 73);
    g.strokePath();
    g.fillStyle(PALETTE.serenity, 0.9);
    g.fillEllipse(34, 71, 5.4, 9); // 눈물
  } else if (expr === 'wink') {
    arch(43); slit(67); smileArc(54, 5);
  }
}

// 단일 초상화 생성. key 예: 'pt_bongi', 'pt_bongi_smile', 'pt_bongi_mint'
export function makeBongiPortrait(scene, key, colorName = 'rose', expr = 'neutral', withCard = true) {
  const body = BONGI_COLORS[colorName] ?? BONGI_COLORS.rose;
  const hi = mix(body, 0xffffff, 0.5);
  const cheek = mix(body, PALETTE.danger, 0.45);
  const halo = colorName === 'serenity' ? PALETTE.lavender : PALETTE.serenity;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  if (withCard) {
    g.fillStyle(PALETTE.panel, 1);
    g.fillRoundedRect(0, 0, W, H, 12);
  }

  // 별 후광 (뒤) — 2겹
  g.fillStyle(halo, 0.34);
  g.fillPoints(starPoints(55, 56, 46, 20, 5, -Math.PI / 2), true);
  g.fillStyle(halo, 0.2);
  g.fillPoints(starPoints(55, 56, 52, 22, 5, -Math.PI / 2 + 0.32), true);

  // 별 안테나 (몸 뒤에서 위로)
  g.lineStyle(2.6, PALETTE.gold, 1);
  g.beginPath();
  g.moveTo(55, 30); g.lineTo(55, 20);
  g.strokePath();
  g.fillStyle(PALETTE.gold, 1);
  g.fillPoints(starPoints(55, 14, 7.5, 3.2, 5, -Math.PI / 2), true);

  // 몸통 (둥근)
  g.fillStyle(body, 1);
  g.fillCircle(55, 58, 28);
  g.fillStyle(hi, 0.5);
  g.fillEllipse(45, 49, 26, 20); // 하이라이트

  // 스터비 팔
  g.fillStyle(body, 1);
  g.fillCircle(28, 66, 7);
  g.fillCircle(82, 66, 7);

  // 볼터치
  g.fillStyle(cheek, 0.6);
  g.fillEllipse(40, 66, 11, 7);
  g.fillEllipse(70, 66, 11, 7);

  face(g, expr);

  // 반짝임
  sparkle(g, 90, 42, 2.4);
  sparkle(g, 20, 84, 2);
  sparkle(g, 96, 90, 1.7);

  g.generateTexture(key, W, H);
  g.destroy();
}

// 전체 생성 — 기본 pt_bongi(rose/neutral) + 표정 5종 + 색 배리언트 5종 + 스프라이트용
export function makeBongiPortraits(scene) {
  makeBongiPortrait(scene, 'pt_bongi', 'rose', 'neutral');
  BONGI_FACES.forEach((f) => makeBongiPortrait(scene, `pt_bongi_${f}`, 'rose', f));
  Object.keys(BONGI_COLORS).forEach((c) => makeBongiPortrait(scene, `pt_bongi_${c}`, c, 'neutral'));
  Object.keys(BONGI_COLORS).forEach((c) =>
    makeBongiPortrait(scene, `sprite_bongi_${c}`, c, 'neutral', false)
  );
}
