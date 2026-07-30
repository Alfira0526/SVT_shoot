// 봉이 v2 — 둥근 정령형 초상화 텍스처 제너레이터
// BootScene._makePortraits() 의 pt_bongi 블록을 이 모듈 호출로 교체한다.
//   import { makeBongiPortraits, BONGI_COLORS, BONGI_FACES } from '../entities/BongiPortrait.js';
//   makeBongiPortraits(this);            // pt_bongi + pt_bongi_<face> + pt_bongi_<color> 전부 생성
// 외부 이미지 파일 없음 — 기존 프로그램적 텍스처 생성 방식(§9-2) 유지.

import Phaser from 'phaser';
import { PALETTE } from '../config/constants.js';

export const W = 110;
export const H = 120;

// 바디 색 — constants.PALETTE 실값 + 파생 2색(mint/lavender, oklch 조화 파생)
export const BONGI_COLORS = {
  rose: PALETTE.rose, // 0xf1c7d2 기본
  serenity: PALETTE.serenity, // 0x9cc1e5
  gold: PALETTE.gold, // 0xffd66b
  mint: 0x8fdcc2, // 파생 — 승인 후 constants 로 승격
  lavender: 0xc9b8e8, // 파생 — 동일
};

export const BONGI_FACES = ['neutral', 'surprise', 'smile', 'sorry', 'wink'];

const INK = 0x2a2a3a;
const CREAM = 0xfff8dc;

function mix(color, target, t) {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const d = Phaser.Display.Color.IntegerToColor(target);
  return Phaser.Display.Color.GetColor(
    c.red + (d.red - c.red) * t,
    c.green + (d.green - c.green) * t,
    c.blue + (d.blue - c.blue) * t
  );
}

// 2차 베지어를 폴리곤으로 채움 (Graphics 에 bezier fill 이 없어 points 로 대체)
function fillCurve(g, pts, steps = 18) {
  const curve = new Phaser.Curves.Spline(pts.map(([x, y]) => new Phaser.Math.Vector2(x, y)));
  g.fillPoints(curve.getPoints(steps), true, true);
}

function wing(g, cx, cy, dir, bodyColor) {
  const p = (x, y) => [cx + x * dir, cy + y];
  g.fillStyle(CREAM, 1);
  fillCurve(g, [p(23, 4), p(30, -8), p(41, -14), p(45, -5), p(38, 3), p(32, 8)]);
  // 결(vein) — 끝점을 페탈 안쪽으로 넣어 실루엣 밖 삐침 방지
  g.lineStyle(1.2, mix(bodyColor, 0x000000, 0.3), 0.32);
  g.beginPath();
  g.moveTo(...p(26, 3));
  g.lineTo(...p(33, -6));
  g.lineTo(...p(37, -7));
  g.strokePath();
}

function face(g, expr) {
  const slit = (x) => {
    g.fillStyle(INK, 1);
    g.fillRoundedRect(x - 4, 54, 8, 17, 4);
    g.fillStyle(0xffffff, 0.95);
    g.fillRoundedRect(x - 2, 57, 3.5, 6, 1.8);
  };
  const round = (x, r) => {
    g.fillStyle(INK, 1);
    g.fillCircle(x, 62, r);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(x - r * 0.35, 62 - r * 0.4, r * 0.34);
  };
  const arch = (x) => {
    g.lineStyle(3.4, INK, 1);
    g.beginPath();
    g.arc(x, 66, 7, Phaser.Math.DegToRad(191), Phaser.Math.DegToRad(349));
    g.strokePath();
  };
  const smileArc = (x, r) => {
    g.lineStyle(3, INK, 1);
    g.beginPath();
    g.arc(x, 74, r, Phaser.Math.DegToRad(27), Phaser.Math.DegToRad(153));
    g.strokePath();
  };

  if (expr === 'neutral') {
    slit(41);
    slit(69);
    smileArc(55, 5);
  } else if (expr === 'surprise') {
    round(41, 8.4);
    round(69, 8.4);
    g.fillStyle(INK, 1);
    g.fillEllipse(55, 79, 8.8, 10.8);
  } else if (expr === 'smile') {
    arch(41);
    arch(69);
    g.fillStyle(INK, 1);
    g.slice(55, 73, 7, Phaser.Math.DegToRad(7), Phaser.Math.DegToRad(173));
    g.fillPath();
    g.fillStyle(PALETTE.danger, 1);
    g.slice(55, 79.4, 3.2, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360));
    g.fillPath();
  } else if (expr === 'sorry') {
    g.fillStyle(INK, 1);
    g.fillRoundedRect(37, 58, 8, 12, 4);
    g.fillRoundedRect(65, 58, 8, 12, 4);
    g.fillStyle(0xffffff, 0.95);
    g.fillRoundedRect(39, 60, 3.5, 4, 1.8);
    g.fillRoundedRect(67, 60, 3.5, 4, 1.8);
    g.lineStyle(3, INK, 1);
    g.beginPath();
    g.moveTo(49, 77);
    g.lineTo(55, 73);
    g.lineTo(61, 77);
    g.strokePath();
    g.fillStyle(PALETTE.serenity, 0.9);
    g.fillEllipse(32, 75, 5.6, 9.2); // 눈물 한 방울
  } else if (expr === 'wink') {
    arch(41);
    slit(69);
    smileArc(54, 5);
  }
}

// 단일 초상화 텍스처 생성. key 예: 'pt_bongi', 'pt_bongi_smile', 'pt_bongi_mint'
export function makeBongiPortrait(scene, key, colorName = 'rose', expr = 'neutral', withCard = true) {
  const body = BONGI_COLORS[colorName] ?? BONGI_COLORS.rose;
  const lo = mix(body, 0x000000, 0.3);
  const hi = mix(body, 0xffffff, 0.45);
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  if (withCard) {
    g.fillStyle(PALETTE.panel, 1);
    g.fillRoundedRect(0, 0, W, H, 12);
    g.fillStyle(body, 0.14); // 은은한 후광 (Graphics 는 그라디언트 미지원 → 2겹 원으로 근사)
    g.fillCircle(55, 60, 46);
    g.fillStyle(body, 0.1);
    g.fillCircle(55, 60, 30);
  }

  wing(g, 55, 54, -1, body);
  wing(g, 55, 54, 1, body);

  // 안테나 + 응원봉 오브
  g.lineStyle(2.6, lo, 1);
  g.beginPath();
  g.moveTo(55, 36);
  g.lineTo(59, 25);
  g.lineTo(64, 19);
  g.strokePath();
  g.fillStyle(PALETTE.light, 1);
  g.fillCircle(65, 15, 7);
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(63, 13, 2.8);

  // 바디
  g.fillStyle(body, 1);
  g.fillEllipse(55, 64, 64, 60);
  g.fillStyle(hi, 0.5);
  g.fillEllipse(45, 51, 38, 28);
  // 볼터치 — 고정 핑크가 아니라 바디 색에서 파생(비핑크 배리언트에서 회색으로 죽는 문제 방지)
  g.fillStyle(mix(body, 0x000000, 0.24), 0.62);
  g.fillEllipse(34, 71, 13, 8);
  g.fillEllipse(76, 71, 13, 8);

  face(g, expr);

  // 반짝임
  g.fillStyle(PALETTE.light, 1);
  // 날개 영역(x10~25 / y38~58) 밖으로 배치 — 크림 페탈과 병합되어 노치처럼 보이는 문제 방지
  [
    [13, 72, 2.6],
    [97, 68, 2.2],
    [26, 101, 1.7],
  ].forEach(([x, y, s]) => {
    g.fillTriangle(x, y - s * 1.4, x + s * 1.4, y, x, y + s * 1.4);
    g.fillTriangle(x, y - s * 1.4, x - s * 1.4, y, x, y + s * 1.4);
  });

  g.generateTexture(key, W, H);
  g.destroy();
}

// 전체 생성 — 기본 pt_bongi(rose/neutral) + 표정 5종 + 색 배리언트 5종
export function makeBongiPortraits(scene) {
  makeBongiPortrait(scene, 'pt_bongi', 'rose', 'neutral');
  BONGI_FACES.forEach((f) => makeBongiPortrait(scene, `pt_bongi_${f}`, 'rose', f));
  Object.keys(BONGI_COLORS).forEach((c) => makeBongiPortrait(scene, `pt_bongi_${c}`, c, 'neutral'));
  // 인게임 스프라이트용(카드 배경 없는 32px 스케일 사용) — 동료 정령 아이템/이펙트에 활용
  Object.keys(BONGI_COLORS).forEach((c) =>
    makeBongiPortrait(scene, `sprite_bongi_${c}`, c, 'neutral', false)
  );
}
