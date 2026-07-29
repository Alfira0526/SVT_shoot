import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../config/constants.js';

// 컷씬 배경 렌더러 (D31) — 실제 이미지(cutscenes/*.png)가 로드돼 있으면 그걸 쓰고,
// 없으면 그라데이션+실루엣 절차 폴백을 그린다(이미지 제작 T22가 개발을 블로킹하지 않음).
// 핵심 피사체는 상단 2/3에 배치(하단 1/3은 대사창 오버레이 영역, §2.10).
// 반환: 파괴 가능한 Container.
export function renderCut(scene, cutId, imageKey) {
  const c = scene.add.container(0, 0);
  if (imageKey && scene.textures.exists(imageKey)) {
    const img = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, imageKey);
    const s = Math.max(GAME_WIDTH / img.width, GAME_HEIGHT / img.height); // cover-fit
    img.setScale(s);
    c.add(img);
    return c;
  }
  const g = scene.add.graphics();
  c.add(g);
  (CUTS[cutId] || CUTS._default)(scene, g, c);
  return c;
}

// ── 그리기 헬퍼 ─────────────────────────────────────────────
function grad(g, top, bottom) {
  g.fillGradientStyle(top, top, bottom, bottom, 1);
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}
function glow(scene, c, x, y, r, color, alpha = 0.5) {
  const img = scene.add.image(x, y, 'spark').setTint(color).setAlpha(alpha).setBlendMode(Phaser.BlendModes.ADD);
  img.setScale(r / 4); // spark=8px → r 반경 근사
  c.add(img);
  return img;
}
function crowd(scene, g) {
  // 하단 인파 실루엣 (색 없이도 구분되는 어두운 덩어리)
  g.fillStyle(0x000000, 0.55);
  for (let x = -20; x < GAME_WIDTH + 20; x += 34) {
    const h = 70 + ((x * 7) % 40);
    g.fillCircle(x, GAME_HEIGHT - 10, 26); // 머리
    g.fillRect(x - 16, GAME_HEIGHT - 10, 32, h); // 몸
  }
}
function backProtagonist(scene, g, c) {
  // 주인공 뒷모습 실루엣 (자기투영 — 얼굴 미노출, §2.10)
  const x = GAME_WIDTH / 2, y = GAME_HEIGHT * 0.62;
  g.fillStyle(0x05040c, 0.92);
  g.fillCircle(x, y, 30); // 머리
  g.fillRoundedRect(x - 40, y + 20, 80, 150, 20); // 어깨·등
  glow(scene, c, x + 34, y + 30, 26, PALETTE.light, 0.9); // 손에 든 응원봉 빛
}

// ── 컷별 절차 폴백 ──────────────────────────────────────────
const CUTS = {
  _default(scene, g) {
    grad(g, PALETTE.deepMid, PALETTE.deep);
  },

  // C1 콘서트장 앞 — 불빛·인파, 주인공 뒷모습 (설렘)
  c1(scene, g, c) {
    grad(g, 0x241a3a, PALETTE.deep);
    glow(scene, c, GAME_WIDTH / 2, 150, 190, PALETTE.serenity, 0.35); // 무대 조명
    glow(scene, c, GAME_WIDTH / 2, 120, 120, PALETTE.rose, 0.3);
    // 응원봉 빛 바다
    for (let i = 0; i < 40; i++) {
      const x = ((i * 53) % GAME_WIDTH) + 6;
      const y = GAME_HEIGHT * 0.5 + ((i * 37) % 220);
      glow(scene, c, x, y, 7 + (i % 3) * 3, i % 2 ? PALETTE.rose : PALETTE.light, 0.5);
    }
    crowd(scene, g);
    backProtagonist(scene, g, c);
  },

  // C2 부스 + 카드 뒷면 (탭 대기 배경 — 카드 자체는 beat가 그림)
  c2(scene, g, c) {
    grad(g, PALETTE.panel, PALETTE.deep);
    glow(scene, c, GAME_WIDTH / 2, 250, 150, PALETTE.serenity, 0.22);
    // 부스 카운터
    g.fillStyle(0x241f3e, 1);
    g.fillRoundedRect(40, 470, GAME_WIDTH - 80, 210, 16);
    g.fillStyle(0x2f2952, 1);
    g.fillRoundedRect(40, 470, GAME_WIDTH - 80, 40, 16);
    g.lineStyle(2, PALETTE.serenity, 0.4);
    g.strokeRoundedRect(40, 470, GAME_WIDTH - 80, 210, 16);
  },

  // C3 13장 전체 공개 (빛 연출)
  c3(scene, g, c) {
    grad(g, 0x3a2c50, PALETTE.deep);
    glow(scene, c, GAME_WIDTH / 2, 300, 260, PALETTE.light, 0.4);
    glow(scene, c, GAME_WIDTH / 2, 300, 150, PALETTE.rose, 0.35);
  },

  // C4 사고 순간 (휘청, 흩어지는 카드, 위험색)
  c4(scene, g, c) {
    grad(g, 0x3a1526, PALETTE.deep);
    // 노이즈 스트릭
    g.fillStyle(PALETTE.danger, 0.5);
    for (let i = 0; i < 6; i++) {
      const y = 120 + i * 70;
      g.fillRect(0, y, GAME_WIDTH, 3 + (i % 3));
    }
    crowd(scene, g);
    // 기울어진 주인공 실루엣
    const x = GAME_WIDTH / 2 + 30, y = GAME_HEIGHT * 0.6;
    g.fillStyle(0x05040c, 0.9);
    g.fillCircle(x, y, 28);
    g.fillRoundedRect(x - 34, y + 18, 68, 130, 18);
  },

  // C5 응원봉 클로즈업 (빛나는 순간 — 봉이 정체 유예)
  c5(scene, g, c) {
    grad(g, 0x1a1730, 0x05040c);
    glow(scene, c, GAME_WIDTH / 2, GAME_HEIGHT * 0.42, 220, PALETTE.light, 0.55);
    // 손 실루엣
    g.fillStyle(0x07060f, 0.95);
    g.fillRoundedRect(GAME_WIDTH / 2 - 46, GAME_HEIGHT * 0.5, 92, 220, 30);
    // 응원봉 대
    g.fillStyle(0xece7d0, 1);
    g.fillRoundedRect(GAME_WIDTH / 2 - 6, GAME_HEIGHT * 0.34, 12, 130, 6);
    // 응원봉 오브
    g.fillStyle(PALETTE.light, 1);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.34, 24);
    glow(scene, c, GAME_WIDTH / 2, GAME_HEIGHT * 0.34, 60, PALETTE.light, 0.8);
  },
};
