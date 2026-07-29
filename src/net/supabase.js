// 랭킹 백엔드 어댑터 (§6, §9-6)
// 동작 모드는 빌드 시 환경변수로 자동 결정:
//   VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY 둘 다 설정 → 원격(Supabase) 모드
//   미설정(v1 파일럿 기본) → localStorage 로컬 랭킹
// 원격/로컬 모두 동일한 submitScore/fetchRanking 인터페이스. 원격 실패 시 로컬로 폴백.
//
// 서버측 검증(§6)은 Supabase Edge Function(supabase/functions/submit-score)에서 최종 수행:
//   ① 이론상 최대 점수 상한 ② 플레이시간 대비 점수 비율 ③ 제출 빈도 ④ 닉네임 길이·금칙어.
// 아래 클라이언트 검증은 1차 방어(캐주얼 조작 차단)이며, 서버가 동일 로직으로 재검증한다.

import { STORAGE, SCORE_PER_SEC_CAP, NICKNAME } from '../config/constants.js';
import { containsBanned } from '../systems/Filter.js';

const SUPABASE_CONFIG = {
  url: (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, ''),
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
};
const REMOTE_ENABLED = !!(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);

export function isRemoteRanking() {
  return REMOTE_ENABLED;
}

const MAX_ROWS = 100;

function authHeaders() {
  return {
    apikey: SUPABASE_CONFIG.anonKey,
    Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
  };
}

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.localRanking) || '[]');
  } catch {
    return [];
  }
}

function writeLocal(rows) {
  try {
    localStorage.setItem(STORAGE.localRanking, JSON.stringify(rows.slice(0, MAX_ROWS)));
  } catch {
    /* 저장 실패는 무시 (프라이빗 모드 등) */
  }
}

/**
 * 점수 제출. 서버 검증(§6)의 클라이언트 1차 방어를 동일 로직으로 선반영.
 * @param {{nickname,score,mode,maxAllowed,playMs}} p
 * @returns {Promise<{ ok:boolean, rank:number|null, reason?:string }>}
 */
export async function submitScore({
  nickname,
  score,
  mode = 'stage',
  maxAllowed = Infinity,
  playMs = 0,
}) {
  // 검증 ①: 이론상 최대 점수 상한
  if (typeof score !== 'number' || score < 0 || score > maxAllowed) {
    return { ok: false, rank: null, reason: 'score-out-of-range' };
  }
  // 검증 ②: 플레이 시간 대비 점수 비율 상한
  if (playMs > 0) {
    const perSec = score / (playMs / 1000);
    if (perSec > SCORE_PER_SEC_CAP) {
      return { ok: false, rank: null, reason: 'rate-too-high' };
    }
  }
  // 검증 ④: 닉네임 길이·금칙어
  const nick = String(nickname || '').trim();
  if (nick.length < NICKNAME.min || nick.length > NICKNAME.max || containsBanned(nick)) {
    return { ok: false, rank: null, reason: 'nickname-rejected' };
  }

  const entry = {
    nickname: nick.slice(0, NICKNAME.max),
    score: Math.floor(score),
    mode,
    play_ms: Math.floor(playMs),
    at: nowIso(),
  };

  if (REMOTE_ENABLED) {
    try {
      return await submitRemote(entry);
    } catch (e) {
      // 네트워크 실패 시 로컬로 폴백 (오프라인 관용)
      console.warn('[ranking] remote submit failed, fallback local', e);
    }
  }

  const rows = readLocal();
  rows.push(entry);
  rows.sort((a, b) => b.score - a.score);
  writeLocal(rows);
  const rank = rows.findIndex((r) => r === entry) + 1;
  return { ok: true, rank: rank > 0 ? rank : null };
}

/**
 * 랭킹 보드 조회 (상위 N).
 * @returns {Promise<Array<{nickname,score,mode,at}>>}
 */
export async function fetchRanking({ mode = 'stage', limit = 20 } = {}) {
  if (REMOTE_ENABLED) {
    try {
      return await fetchRemote({ mode, limit });
    } catch (e) {
      console.warn('[ranking] remote fetch failed, fallback local', e);
    }
  }
  return readLocal()
    .filter((r) => r.mode === mode)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ── 원격 구현 (Supabase) ─────────────────────────────────
// 제출은 Edge Function(service_role 로 검증·insert)을 통해서만. anon 직접 insert는 RLS로 차단.
async function submitRemote(entry) {
  const res = await fetch(`${SUPABASE_CONFIG.url}/functions/v1/submit-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      nickname: entry.nickname,
      score: entry.score,
      mode: entry.mode,
      play_ms: entry.play_ms,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 함수가 검증 반려(422 등)를 명시 사유와 함께 반환
    return { ok: false, rank: null, reason: data.reason || `http-${res.status}` };
  }
  return { ok: data.ok !== false, rank: data.rank ?? null, reason: data.reason };
}

// 보드 조회는 REST(select)로. RLS select 정책이 익명 읽기를 허용.
async function fetchRemote({ mode, limit }) {
  const q =
    `${SUPABASE_CONFIG.url}/rest/v1/scores` +
    `?select=nickname,score,mode,play_ms,created_at` +
    `&mode=eq.${encodeURIComponent(mode)}&order=score.desc&limit=${limit}`;
  const res = await fetch(q, { headers: authHeaders() });
  if (!res.ok) throw new Error(`fetch http-${res.status}`);
  const rows = await res.json();
  return rows.map((r) => ({
    nickname: r.nickname,
    score: r.score,
    mode: r.mode,
    play_ms: r.play_ms,
    at: r.created_at,
  }));
}

// new Date() 직접 사용 최소화를 위한 래퍼 (테스트 시 주입 용이)
function nowIso() {
  return new Date().toISOString();
}
