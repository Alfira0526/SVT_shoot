// 게임 전역 상수 — 기획서 §5.3(규격), §2.6(색 토큰), §3.7(점수), §6(랭킹)
// 주의(§7): 그룹명·멤버명·팬덤명 등 공식 IP는 코드/에셋/공개물에 일절 사용하지 않음.
// 여기 정의는 전면 노출 가능 등급(색/숫자/일반용어)만 포함한다.

// ── 게임 제목 (T2 확정, 2026-07-30 — "덕질할 결심") ──
export const GAME_TITLE = '덕질할 결심';
export const GAME_SUBTITLE = '빛의 세계 · 온빛';
export const TITLE_CANDIDATES = ['티켓팅 워리어', '덕질 원정대']; // (참고) T2 이전 후보

// ── 논리 해상도 (세로 모바일) ─────────────────────────────
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 800;

// ── UI 강조색 팔레트 (§2.6 전면 노출 가능 등급, 전역 토큰) ──
// 색상값 자체는 저작권 보호 대상이 아님. UI·빛 이펙트 기본색으로 사용.
export const PALETTE = {
  // 강조색 2종 (웜핑크/스카이블루 계열 — 빛 이펙트·UI 강조)
  rose: 0xf1c7d2,
  serenity: 0x9cc1e5,
  roseHex: '#f1c7d2',
  serenityHex: '#9cc1e5',
  // 배경·심연 (온빛이 흐려진 세계)
  deep: 0x0d0b1a,
  deepHex: '#0d0b1a',
  deepMid: 0x1a1730,
  panel: 0x161327,
  panelHex: '#161327',
  // 빛(플레이어 탄·온빛 결정)
  light: 0xfdf6c9,
  lightHex: '#fdf6c9',
  // 위험(적 탄·노이즈)
  danger: 0xff5d73,
  dangerHex: '#ff5d73',
  // 적 계열·성공/아이템 (도트 에셋 팔레트 승격 — 기존 BootScene 하드코딩분)
  noise: 0x6e63a8,
  ok: 0x4be08a,
  okHex: '#4be08a',
  // 봉이 배리언트 파생색 (BongiPortrait 조화 파생)
  mint: 0x8fdcc2,
  lavender: 0xc9b8e8,
  // 텍스트
  ink: '#f6f2ff',
  inkDim: '#b9b2d6',
  gold: 0xffd66b,
  goldHex: '#ffd66b',
};

// ── 연출·보너스 수치 (§2.6 / §4.2) ───────────────────────
export const LUCKY = {
  rosterSize: 13, // 수호자 도감 정원(연출 수치)
  ticketHour: 8, // 8:00 정각 티켓팅
};

// ── 플레이어 (§3.2 사망 처리, §3.3 조작) ──────────────────
export const PLAYER = {
  startLives: 3, // 잔기 3, 컨티뉴 없음 (D16)
  speedLerp: 0.35, // 드래그 추종 보간
  dragOffsetY: 64, // 손가락 위 오프셋 (§3.3)
  fireIntervalMs: 220,
  invincibleMs: 1400, // 피격 후 짧은 무적
  maxPower: 3, // 탄 1열 → 최대 3열 (응원봉 파워업)
  hitRadius: 7, // 판정(그레이즈 여지) — 겉보기보다 작게
};

// ── 점수 체계 (§3.7) ─────────────────────────────────────
export const SCORE = {
  mobKill: 100,
  bossTick: 10, // 보스 데미지 틱당
  bossKill: 10000,
  noMiss: 5000,
};

// ── 서버측 검증용: 모드별 이론상 최대 점수 상한 (T7, §6) ──
// (총 잡몹 수 × 100) + (보스HP/틱데미지 × 10) + 보스격파 + 노미스
export function theoreticalMaxScore({ totalMobs, bossHp, tickDamage }) {
  const mobs = (totalMobs || 0) * SCORE.mobKill;
  const bossDamageTicks =
    tickDamage > 0 ? Math.ceil(bossHp / tickDamage) * SCORE.bossTick : 0;
  return mobs + bossDamageTicks + SCORE.bossKill + SCORE.noMiss;
}

// ── 랭킹/저장 (§5.5, §6 / 인수인계 §5) ───────────────────
// v1 localStorage 키 — v2 Supabase progress 테이블 컬럼과 1:1 대응되게 설계(D28)
//   fs_nickname            → progress.nickname
//   fs_progress            → progress.{cleared_stages, best_score, no_miss_clear}
//   fs_settings            → progress.settings {bgm, sfx}
export const STORAGE = {
  nickname: 'fs_nickname',
  progress: 'fs_progress', // { clearedStages:[], bestScore:0, noMissClear:false }
  settings: 'fs_settings', // { bgm:true, sfx:true }
  localRanking: 'fs_ranking_stage', // v1 로컬 보드 [{ nickname, score, mode, play_ms, at }]
  dev: 'fs_dev', // QA 개발자 모드 on/off (무제한 라이프). 클라 전용 — 보안 아님
  endless: 'fs_endless', // 엔들리스 모드 성장/기록 { bestDistance, totalGold }
};

// ── 엔들리스 모드 (드래곤 플라이트식 무한 상승 · 성장 루프) ──
// 스토리 캠페인과 별개 모드. 거리(m)=점수, 별조각=성장 재화(펫·업그레이드는 차기).
export const ENDLESS = {
  scrollBase: 130, // 시작 스크롤 속도(px/s)
  scrollMax: 300, // 최대 스크롤 속도
  distancePerPx: 0.06, // 스크롤 1px당 누적 거리(m) 환산
  spawnStartMs: 900, // 잡몹 스폰 간격 시작
  spawnMinMs: 320, // 잡몹 스폰 간격 하한(난도 상승 수렴값)
  rampDistance: 2000, // 이 거리에서 난도 램프가 최대에 근접
  bossFirstAt: 400, // 첫 구간 보스 등장 거리
  bossGap: 550, // 이후 보스 간 거리(점증)
  coinRowMs: 2400, // 별조각 줄 스폰 간격
  killCoinChance: 0.6, // 잡몹 처치 시 별조각 드랍 확률
};

// QA 개발자 모드 — 타이틀 숨김 버튼 + 패스워드로 진입. 무제한 라이프(무적).
// 주의: 클라이언트 번들에 노출되는 값이라 보안용 아님(캐주얼 차단용). 팀 공유 후 필요 시 교체.
export const DEV_PASSWORD = 'qa-guardian';

// 닉네임 규칙 (인수인계 §6: scores.nickname 2~8자)
export const NICKNAME = {
  min: 2,
  max: 8,
};

// 금칙어 필터 (§6 ④ — 아티스트 비방 방지, 클라 1차 / 서버 2차).
// 최소 방어용 목록 — 서버 이관(v1.5) 시 서버측 목록이 최종 기준. 확장은 QA 관리.
export const BANNED_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'nigger', 'faggot',
  '씨발', '시발', '씨빨', '개새', '병신', '지랄', '좆', '보지', '자지', '섹스', '창녀', '한남', '한녀',
];

// 필터 실패·빈 닉네임 시 대사 호칭 대체값 (인수인계 §6)
export const FALLBACK_NAME = '신입 수호자';

// 서버 검증 ②: 플레이 시간 대비 점수 비율 상한 (점수/초). 캐주얼 조작 차단용 보수값.
export const SCORE_PER_SEC_CAP = 4000;
