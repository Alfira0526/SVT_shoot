// 수호자 육성 — 경험치·레벨·진화 단계 수식 (순수 함수, IP 무관)
// 교체 파티로 플레이 → 장착 수호자가 EXP 획득 → 레벨업 → 3단계 진화(겉모습 변화).

export const MAX_LEVEL = 10;

// level(현재)에서 다음 레벨까지 필요한 EXP
export function expToNext(level) {
  return 60 + level * 30; // Lv1→2:90, Lv2→3:120 … 완만한 상승
}

// 누적 EXP → { level, into(현 레벨 진행분), need(다음까지 필요), max }
export function levelFromExp(exp) {
  let level = 1;
  let rem = Math.max(0, Math.floor(exp || 0));
  while (level < MAX_LEVEL && rem >= expToNext(level)) {
    rem -= expToNext(level);
    level += 1;
  }
  const max = level >= MAX_LEVEL;
  return { level, into: max ? 0 : rem, need: max ? 0 : expToNext(level), max };
}

// 레벨 → 진화 단계 (1 각성 / 2 성장 / 3 만개)
export function stageFromLevel(level) {
  return level < 4 ? 1 : level < 8 ? 2 : 3;
}

export const STAGE_NAME = { 1: '각성', 2: '성장', 3: '만개' };
