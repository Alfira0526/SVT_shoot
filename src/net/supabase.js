// 랭킹 백엔드 어댑터 (§6, §9-6)
// v1 파일럿: localStorage 로컬 랭킹으로 동작.
// v1.5~ : 아래 SUPABASE_CONFIG 채우고 submitRemote/fetchRemote 구현부를 활성화하면
//         동일 인터페이스로 Supabase(scores 테이블 mode 컬럼: stage/endless)로 전환.
//
// 서버측 검증(§6): 이론상 최대 점수 상한 · 플레이시간 대비 점수 비율 · 제출 빈도 · 닉네임 금칙어.
// 클라 점수는 원천 조작 가능 — 목표는 캐주얼 조작 차단(전제 사실).

import { STORAGE, SCORE_PER_SEC_CAP, NICKNAME } from '../config/constants.js';
import { containsBanned } from '../systems/Filter.js';

const SUPABASE_CONFIG = {
  url: '', // 예: https://xxxx.supabase.co
  anonKey: '', // 공개 anon key
  enabled: false, // true 로 바꾸면 원격 모드
};

const MAX_ROWS = 100;

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

  if (SUPABASE_CONFIG.enabled) {
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
  if (SUPABASE_CONFIG.enabled) {
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

// ── 원격 구현 자리(placeholder) — v1.5~ 활성화 ─────────────
async function submitRemote(_entry) {
  // TODO(v1.5): supabase-js 또는 Edge Function fetch 로 교체.
  throw new Error('remote-not-implemented');
}
async function fetchRemote(_opts) {
  throw new Error('remote-not-implemented');
}

// new Date() 직접 사용 최소화를 위한 래퍼 (테스트 시 주입 용이)
function nowIso() {
  return new Date().toISOString();
}
