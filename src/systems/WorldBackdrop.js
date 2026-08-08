import Phaser from 'phaser';
import { GAME_WIDTH as W, GAME_HEIGHT as H, PALETTE } from '../config/constants.js';

// 세계별 특색 배경 (Phase D) — 각 세계의 컨셉을 절차적 배경으로.
// 원칙: 분위기 전달용 저대비·저채도. 중앙 플레이 영역은 비워 탄/몹 가독성(회피 공정성) 유지.
// 배경은 depth -9대(베이스 -10 위, 게임플레이 0 위 아래). 대부분 정적 + 은은한 애니 1~2개.
//
// 사용: WorldBackdrop.render(scene, worldId) → 그려진 요소들의 컨테이너 반환(정리는 씬 종료 시 자동).

const DEPTH = -9.4;

function layer(scene) {
  return scene.add.container(0, 0).setDepth(DEPTH);
}
function grad(g, top, bottom) {
  g.fillGradientStyle(top, top, bottom, bottom, 1);
  g.fillRect(0, 0, W, H);
}
// 부드러운 발광 원(스파크 텍스처 재사용). alpha 낮게.
function glow(scene, c, x, y, r, color, alpha = 0.25) {
  const img = scene.add.image(x, y, 'spark').setTint(color).setAlpha(alpha)
    .setBlendMode(Phaser.BlendModes.ADD).setScale(r / 4);
  c.add(img);
  return img;
}
// 상단/측면 위주 실루엣(중앙 회피영역 보호). 반환 graphics.
function gfx(scene, c) {
  const g = scene.add.graphics();
  c.add(g);
  return g;
}

// ── 세계별 배경 ─────────────────────────────────────────────
const SCENES = {
  // 쿵 — 입덕·낙하. 위로 흐르는 바람선 + 아래에서 올라오는 얼굴 실루엣.
  w_pollin(scene, c) {
    const g = gfx(scene, c);
    grad(g, 0x2a1424, 0x0d0713);
    g.lineStyle(2, PALETTE.rose, 0.10);
    for (let i = 0; i < 14; i++) { const x = (i * 41) % W; g.lineBetween(x, 0, x + 30, H); } // 낙하 바람선
    // 아래에서 떠오르는 얼굴(둥근 실루엣들)
    g.fillStyle(0xff8fa3, 0.06);
    for (let i = 0; i < 4; i++) g.fillCircle(60 + i * 120, H - 30 + (i % 2) * 20, 46);
    glow(scene, c, W / 2, H * 0.2, 120, PALETTE.rose, 0.14);
  },

  // 뽑기장 — 포카·뽑기. 겹쳐 쌓인 봉투/카드 실루엣 + 홀로 반짝.
  w_pick(scene, c) {
    const g = gfx(scene, c);
    grad(g, 0x1c2340, 0x0a0c18);
    g.fillStyle(0x9a8fd6, 0.08);
    for (let i = 0; i < 7; i++) { const x = 20 + (i * 63) % (W - 40); const y = H - 120 + (i % 3) * 40; g.fillRoundedRect(x, y, 44, 64, 5); } // 봉투 더미(하단)
    g.lineStyle(1, 0xffffff, 0.06);
    for (let i = 0; i < 6; i++) { const x = (i * 80 + 30) % W; g.lineBetween(x, 40, x + 24, 120); } // 홀로 사선
    glow(scene, c, W * 0.7, H * 0.25, 90, PALETTE.serenity, 0.12);
  },

  // 무한로비 — 새로고침·대기열. 흰 글레어 + 떠다니는 로딩 스피너 링 + 대기 실루엣.
  w_saerok(scene, c) {
    const g = gfx(scene, c);
    grad(g, 0x243040, 0x0c1018);
    g.fillStyle(0xffffff, 0.05); g.fillRect(0, 0, W, H); // 눈 시린 흰 화면 기운
    g.lineStyle(2.5, PALETTE.serenity, 0.14);
    [[80, 150, 26], [W - 70, 240, 20], [W / 2, 120, 16]].forEach(([x, y, r]) => {
      g.beginPath(); g.arc(x, y, r, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(300)); g.strokePath(); // 끊긴 스피너 호
    });
    g.fillStyle(0x000000, 0.28); // 대기 인파 실루엣(하단)
    for (let x = 0; x < W; x += 40) g.fillRect(x, H - 60, 30, 60);
  },

  // 뒤틀린 관문 — 보안문자·인증. 세로 개찰구/문 격자 + 붉은 경고 명멸.
  w_bitjang(scene, c) {
    const g = gfx(scene, c);
    grad(g, 0x2a1420, 0x0d0710);
    g.lineStyle(3, PALETTE.danger, 0.12);
    for (let x = 30; x < W; x += 60) g.lineBetween(x, 60, x, H - 40); // 세로 창살
    g.lineStyle(1.5, 0xffffff, 0.05);
    for (let y = 80; y < H - 40; y += 34) g.lineBetween(20, y, W - 20, y); // 격자
    const warn = glow(scene, c, W / 2, 100, 70, PALETTE.danger, 0.10); // 경고 명멸
    scene.tweens.add({ targets: warn, alpha: 0.22, duration: 700, yoyo: true, repeat: -1 });
  },

  // 떼창홀 — 떼창·스밍. 하단 이퀄라이저 바 + 물결 파문 + 떼창 인파.
  w_ulrim(scene, c) {
    const g = gfx(scene, c);
    grad(g, 0x123028, 0x08120e);
    g.fillStyle(PALETTE.mint || 0x8fdcc2, 0.14);
    const hs = [30, 60, 90, 50, 110, 70, 40, 95, 55, 80];
    for (let i = 0; i < hs.length; i++) { const x = 12 + i * 46; g.fillRect(x, H - hs[i], 30, hs[i]); } // EQ 바
    g.lineStyle(1.5, PALETTE.mint || 0x8fdcc2, 0.10);
    for (let r = 40; r < 260; r += 60) { g.beginPath(); g.arc(W / 2, H * 0.32, r, 0, Math.PI * 2); g.strokePath(); } // 파문
  },

  // 마감이 안 오는 방 — 총공·투표. 흐르는 숫자열 + 순위표 + 새벽3시 형광.
  w_semi(scene, c) {
    const g = gfx(scene, c);
    grad(g, 0x241f3a, 0x0b0a16);
    g.fillStyle(PALETTE.lavender || 0xc9b8e8, 0.06);
    for (let i = 0; i < 10; i++) { const x = (i * 53) % W; for (let y = (i * 37) % 80; y < H; y += 80) g.fillRect(x, y, 3, 14); } // 흐르는 숫자
    g.lineStyle(1.5, PALETTE.lavender || 0xc9b8e8, 0.12); g.strokeRect(W - 130, 70, 110, 120); // 순위표
    for (let r = 0; r < 4; r++) g.lineBetween(W - 130, 92 + r * 26, W - 20, 92 + r * 26);
    glow(scene, c, W / 2, 40, 200, 0x9fb0ff, 0.06); // 형광 냉기
  },

  // 텅장상점가 — 굿즈·텅장. 상점 진열대 + 매달린 영수증 리본 + SOLD.
  w_yeongsu(scene, c) {
    const g = gfx(scene, c);
    grad(g, 0x2e2718, 0x100c06);
    g.fillStyle(PALETTE.gold, 0.07);
    for (let i = 0; i < 3; i++) g.fillRect(20, 120 + i * 90, W - 40, 10); // 진열 선반
    g.fillStyle(0xffffff, 0.06);
    for (let i = 0; i < 6; i++) { const x = 30 + i * 74; g.fillRect(x, 0, 16, 60 + (i % 3) * 30); } // 매달린 영수증 리본
    glow(scene, c, W * 0.3, H * 0.3, 80, PALETTE.gold, 0.12);
  },

  // 리플레이 협곡 — 직캠·기록. 협곡 벽 + 되감기 화살표 + REC 프레임.
  w_chalna(scene, c) {
    const g = gfx(scene, c);
    grad(g, 0x2a1a18, 0x0d0908);
    g.fillStyle(0x000000, 0.3); // 협곡 양벽
    g.fillTriangle(0, 0, 90, 0, 0, H); g.fillTriangle(W, 0, W - 90, 0, W, H);
    g.lineStyle(3, PALETTE.danger, 0.10);
    for (let i = 0; i < 3; i++) { const y = 120 + i * 160; g.beginPath(); g.arc(W / 2, y, 30, Phaser.Math.DegToRad(40), Phaser.Math.DegToRad(320)); g.strokePath(); } // 되감기 호
    const rec = glow(scene, c, 44, 44, 16, PALETTE.danger, 0.5); // REC 점
    scene.tweens.add({ targets: rec, alpha: 0.15, duration: 800, yoyo: true, repeat: -1 });
  },

  // 영원한 전날 — 컴백·기다림. 거대 카운트다운 보드 D-1 + 목 뺀 인파.
  w_diwon(scene, c) {
    const g = gfx(scene, c);
    grad(g, 0x2c2410, 0x100c05);
    g.fillStyle(0x000000, 0.4); g.fillRoundedRect(W / 2 - 90, 70, 180, 90, 8); // 전광판
    g.lineStyle(2, PALETTE.gold, 0.18); g.strokeRoundedRect(W / 2 - 90, 70, 180, 90, 8);
    g.fillStyle(PALETTE.gold, 0.5); // D-1 (도형)
    g.fillRect(W / 2 - 46, 95, 8, 40); g.fillRect(W / 2 - 20, 110, 24, 6);
    g.fillRect(W / 2 + 20, 95, 8, 40);
    g.fillStyle(0x000000, 0.28); for (let x = 0; x < W; x += 46) g.fillRect(x, H - 54, 34, 54); // 목 뺀 인파
  },

  // 네 시에서 멈춘 밤 — 새벽·불면. 어중간한 파란 창 + 폰빛 + 멈춘 4:44.
  w_nesi(scene, c) {
    const g = gfx(scene, c);
    grad(g, 0x141d33, 0x070a14);
    g.fillStyle(0x2a3a63, 0.5); g.fillRoundedRect(W - 150, 60, 120, 150, 6); // 창(어중간한 색)
    g.lineStyle(2, 0x1a2440, 1); g.strokeRoundedRect(W - 150, 60, 120, 150, 6);
    g.lineBetween(W - 90, 60, W - 90, 210); g.lineBetween(W - 150, 135, W - 30, 135);
    glow(scene, c, 90, H * 0.5, 60, 0xbfe0ff, 0.16); // 폰빛(유일 광원)
    // 멈춘 4:44 (작은 도형)
    g.fillStyle(0x9fb0d0, 0.3); [W / 2 - 20, W / 2 + 8].forEach((x) => { g.fillRect(x, 40, 4, 14); g.fillRect(x + 8, 40, 4, 14); });
  },

  // 앙코르 뒤, 셋째 열 — 상실·졸업. 접힌 객석 줄 + 한 자리 예약석 스포트.
  w_yeobaek(scene, c) {
    const g = gfx(scene, c);
    grad(g, 0x241b34, 0x0c0913);
    g.fillStyle(PALETTE.lavender || 0xc9b8e8, 0.05);
    for (let r = 0; r < 4; r++) for (let s = 0; s < 6; s++) { const x = 24 + s * 74, y = H - 150 + r * 34; g.fillRoundedRect(x, y, 40, 16, 4); } // 접힌 좌석 줄
    // 안 접힌 예약석(스포트)
    glow(scene, c, W / 2, H - 100, 44, PALETTE.rose, 0.16);
    g.fillStyle(PALETTE.rose, 0.10); g.fillRoundedRect(W / 2 - 22, H - 116, 44, 22, 5);
  },

  // 덜 마른 화첩 — 팬창작·2차. 겹친 밑그림 선 + 지우개 가루 + 미완 초상 벽.
  w_seupjak(scene, c) {
    const g = gfx(scene, c);
    grad(g, 0x1a2338, 0x0a0d16);
    g.lineStyle(1.5, 0x8fb0f0, 0.10);
    for (let i = 0; i < 8; i++) { const x = 30 + i * 54; g.lineBetween(x, 60, x - 10 + (i % 3) * 8, H - 80); } // 겹친 밑그림 선
    g.lineStyle(1.5, 0xf6c9a0, 0.08);
    for (let i = 0; i < 4; i++) g.strokeRect(30 + i * 110, 70, 70, 84); // 미완 초상 액자
    g.fillStyle(0xffffff, 0.05); for (let i = 0; i < 20; i++) g.fillCircle((i * 71) % W, (i * 53) % H, 1.3); // 지우개 가루
  },

  // 식은 재의 공터 — 버티기·현타. 온통 회색 재 + 흩어진 꺼진 봉 + 주황 불씨 하나.
  w_janbul(scene, c) {
    const g = gfx(scene, c);
    grad(g, 0x1c1a20, 0x0a090c);
    g.fillStyle(0x3a3540, 0.5); g.fillRect(0, H - 90, W, 90); // 재 바닥
    g.fillStyle(0x2a2630, 0.6); for (let i = 0; i < 14; i++) g.fillCircle((i * 37) % W, H - 70 + (i % 3) * 20, 6 + (i % 3) * 3); // 재 무더기
    const ember = glow(scene, c, W * 0.72, H - 70, 26, 0xffb07a, 0.4); // 안 꺼진 불씨 하나
    scene.tweens.add({ targets: ember, alpha: 0.18, duration: 900, yoyo: true, repeat: -1 });
  },

  // 완결의 문 — 무결. 닫혀가는 문 + 리본 + 삼켜지는 빛(피날레 무대).
  mugyeol(scene, c) {
    const g = gfx(scene, c);
    grad(g, 0x1a1226, 0x07050c);
    g.fillStyle(0x000000, 0.4); g.fillTriangle(0, 0, 130, 0, 0, H); g.fillTriangle(W, 0, W - 130, 0, W, H); // 닫혀가는 문
    g.lineStyle(2.5, 0xd9a63e, 0.14); g.lineBetween(20, H * 0.4, W - 20, H * 0.55); g.lineBetween(20, H * 0.55, W - 20, H * 0.4); // 완결 리본
    glow(scene, c, W / 2, H * 0.3, 120, PALETTE.light, 0.10); // 삼켜지는 빛
  },
};

export const WorldBackdrop = {
  has(worldId) { return !!SCENES[worldId]; },
  render(scene, worldId) {
    const fn = SCENES[worldId];
    if (!fn) return null;
    const c = layer(scene);
    fn(scene, c);
    return c;
  },
};
