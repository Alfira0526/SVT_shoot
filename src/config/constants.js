// 게임 전역 상수 — 기획서 §3.7(점수), §5(해상도), D16(잔기), D28(저장 키)
// 색 토큰은 "라이트&위트 대개편(2026-08)" 트와일라잇 캔디 팝 팔레트 기준. 값만 교체하면 전체 반영.

export const GAME_W = 480;
export const GAME_H = 800;

export const TITLE = '덕질할 결심';
export const SUBTITLE = '세로 탄막 슈팅 · v1 파일럿';
export const VERSION = 'v1.0.0-pilot';

// §14 리스크 대응 — 문제 제기·버그 제보 채널. 비워 두면 정보 화면에 "준비 중"으로 표시됨. (발주자 결정 필요)
export const CONTACT_URL = '';
export const INFO_LINES = [
  '비영리 팬 창작 게임입니다. 광고·후원·결제가 없습니다.',
  '실명·그룹명·공식 이미지·가사를 사용하지 않은 오리지널 세계관입니다.',
  '수집하는 개인정보가 없습니다. 닉네임·점수만 랭킹에 저장됩니다.',
  '권리자 요청 시 해당 요소를 즉시 교체·비공개 처리합니다.',
];

export const COLORS = {
  deep: 0x1e1b3a, // 베이스 (새벽보라)
  panel: 0x272250,
  ink: 0x0f0d21,
  rose: 0xff9ecb, // 캔디핑크
  serenity: 0x86c8ff, // 스카이
  danger: 0xff6b8a,
  coral: 0xff8a5c,
  lemon: 0xffe066,
  grape: 0xb18cff,
  mint: 0x7fe3c6,
  cream: 0xfff3c4,
  gold: 0xffd166,
  white: 0xffffff,
  gray: 0x8f8bb0,
};

export const CSS = Object.fromEntries(
  Object.entries(COLORS).map(([k, v]) => [k, '#' + v.toString(16).padStart(6, '0')])
);

export const FONT = {
  ui: '"Pretendard", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  mono: '"Consolas", "Courier New", monospace',
};

// §3.7 점수 체계
export const SCORE = {
  enemy: 100,
  bossTick: 10,
  bossKill: 10000,
  noMiss: 5000,
};

// §3.2 / §3.3 / §3.6
export const PLAYER = {
  lives: 3,
  keyboardSpeed: 360,
  dragSpeed: 1400,
  fireIntervalMs: 140,
  bulletSpeed: 720,
  bulletDamage: 1,
  invincibleMs: 1500,
  shieldMs: 3000,
  fingerOffsetY: -80, // 손가락 오프셋: 기체가 손가락에 가려지지 않도록 위로
  hitRadius: 6,
  maxPower: 3,
  basePower: 2,
};

export const DEPTH = {
  backdrop: 0,
  stars: 1,
  items: 8,
  enemies: 10,
  enemyBullets: 12,
  playerBullets: 13,
  player: 15,
  fx: 20,
  hud: 50,
  banner: 60,
  overlay: 70,
};

// D28 — localStorage 키 (v2 Supabase progress 테이블과 1:1 대응)
export const STORAGE_KEYS = {
  nickname: 'fs_nickname',
  progress: 'fs_progress',
  settings: 'fs_settings',
  tutorialSeen: 'fs_tutorial_seen',
  localRanking: 'fs_ranking_local',
  pendingScores: 'fs_pending_scores',
  lastSubmit: 'fs_last_submit',
};

// §6 닉네임 규칙 — 필터 실패 시 호칭 대체 (D21)
export const NICKNAME = { min: 2, max: 8 };
export const FALLBACK_NICKNAME = '신입 수호자';
export const BANNED_WORDS = [
  '시발', '씨발', 'ㅅㅂ', '병신', 'ㅂㅅ', '개새', '좆', '니미', '느금', '지랄', '염병',
  'fuck', 'shit', 'bitch', 'asshole', 'admin', '운영자', '관리자',
];

export function sanitizeNickname(raw) {
  const value = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (value.length < NICKNAME.min || value.length > NICKNAME.max) {
    return { ok: false, reason: `닉네임은 ${NICKNAME.min}~${NICKNAME.max}자여야 해요.`, value: null };
  }
  const lower = value.toLowerCase();
  if (BANNED_WORDS.some((w) => lower.includes(w))) {
    return { ok: false, reason: '사용할 수 없는 표현이 있어요.', value: FALLBACK_NICKNAME, replaced: true };
  }
  return { ok: true, value };
}

// §6 서버 검증 상한 (클라이언트 1차 검증에도 동일 값 사용)
export const RANK_LIMITS = {
  minPlayMs: 15000,
  maxScorePerSecond: 600,
  submitCooldownMs: 8000,
  boardSize: 20,
};

// §3.7 이론상 최대 점수 — (총 잡몹 수 × 100) + (보스HP/틱데미지 × 10) + 15,000
export function countStageEnemies(stage) {
  const waves = (stage.waves || []).reduce(
    (sum, w) => sum + (w.spawns || []).reduce((s, sp) => s + (sp.count || 0), 0),
    0
  );
  const summons = stage.boss?.maxSummons || 0;
  return waves + summons;
}

export function theoreticalMaxScore(stages) {
  const list = Array.isArray(stages) ? stages : [stages];
  let total = 0;
  for (const stage of list) {
    total += countStageEnemies(stage) * SCORE.enemy;
    if (stage.boss) {
      total += Math.ceil(stage.boss.hp / PLAYER.bulletDamage) * SCORE.bossTick;
      total += SCORE.bossKill;
    }
  }
  return total + SCORE.noMiss;
}
