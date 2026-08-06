// 장착 수호자 로드아웃 — 두 모드(스토리·엔들리스)가 동일하게 적용.
// 장착 수호자의 빛깔 = 탄 색, 진화 단계 = 소소한 패시브(파워·연사).
import guardians from '../config/guardians.json';
import { BONGI_COLORS } from '../entities/BongiPortrait.js';
import { PALETTE } from '../config/constants.js';
import { levelFromExp, stageFromLevel } from '../config/leveling.js';
import { Save } from './SaveSystem.js';

const BY_ID = {};
guardians.roster.forEach((g) => { BY_ID[g.id] = g; });

export function getGuardianById(id) {
  return BY_ID[id];
}

export function guardianColorHex(g) {
  const key = g && g.color;
  return key && BONGI_COLORS[key] != null ? BONGI_COLORS[key] : PALETTE.rose;
}

// 각성 완료(장착 가능) 수호자 목록 — 봉이 항상 포함
export function awakenedRoster() {
  const awake = new Set(['bongi', ...Save.getAwakenedGuardians()]);
  return guardians.roster.filter((g) => awake.has(g.id));
}

// 현재 장착 로드아웃 (미각성·유실 시 봉이로 폴백)
export function getEquippedLoadout() {
  let id = Save.getEquipped();
  const awake = new Set(['bongi', ...Save.getAwakenedGuardians()]);
  if (!BY_ID[id] || !awake.has(id)) id = 'bongi';
  const guardian = BY_ID[id];
  const exp = Save.getGuardianExp(id);
  const { level } = levelFromExp(exp);
  const stage = stageFromLevel(level);
  return { id, guardian, color: guardianColorHex(guardian), exp, level, stage };
}

// 씬에 로드아웃 적용 — 플레이어 파워/연사 + 탄 색 반환
export function applyLoadout(scene, player) {
  const lo = getEquippedLoadout();
  player.power = lo.stage >= 2 ? 2 : 1; // 성장부터 기본 2열
  player.fireIntervalMs = lo.stage >= 3 ? 170 : null; // 만개 = 연사 강화
  scene._bulletTint = lo.color;
  scene._loadout = lo;
  return lo;
}
