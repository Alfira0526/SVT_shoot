// 공통 UI 헬퍼 — 버튼·텍스트 스타일·패널
import { COLORS, CSS, FONT } from '../config/constants.js';
import { Audio } from './Audio.js';

export function textStyle(size = 18, color = CSS.cream, extra = {}) {
  return {
    fontFamily: FONT.ui,
    fontSize: `${size}px`,
    color,
    ...extra,
  };
}

export function makeButton(scene, x, y, label, onClick, opts = {}) {
  const w = opts.w ?? 240;
  const h = opts.h ?? 58;
  const color = opts.color ?? COLORS.rose;
  const textColor = opts.textColor ?? CSS.ink;
  const radius = opts.radius ?? 16;

  const bg = scene.add.graphics();
  const draw = (fill) => {
    bg.clear();
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    bg.lineStyle(2, COLORS.cream, 0.55);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  };
  draw(color);

  const txt = scene.add
    .text(0, 0, label, textStyle(opts.fontSize ?? 21, textColor, { fontStyle: 'bold' }))
    .setOrigin(0.5);

  const c = scene.add.container(x, y, [bg, txt]);
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.label = txt;
  c.setLabel = (t) => txt.setText(t);

  c.on('pointerdown', (p, lx, ly, ev) => {
    ev?.stopPropagation();
    c.setScale(0.95);
  });
  c.on('pointerup', (p, lx, ly, ev) => {
    ev?.stopPropagation();
    c.setScale(1);
    Audio.sfx('click');
    onClick?.();
  });
  c.on('pointerout', () => c.setScale(1));
  return c;
}

export function makePanel(scene, x, y, w, h, opts = {}) {
  const g = scene.add.graphics();
  g.fillStyle(opts.fill ?? COLORS.panel, opts.alpha ?? 0.94);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, opts.radius ?? 18);
  g.lineStyle(2, opts.stroke ?? COLORS.grape, 0.9);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, opts.radius ?? 18);
  return g;
}

export function formatScore(n) {
  return String(Math.max(0, Math.floor(n))).padStart(7, '0');
}
