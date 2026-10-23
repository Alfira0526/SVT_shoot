// §6 랭킹·보안 — Supabase REST 직접 호출 (SDK 불필요). 환경변수 미설정 시 이 기기(localStorage) 랭킹으로 폴백.
// URL·anon key는 .env 분리 (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). RLS로 서버 방어.
import { RANK_LIMITS, sanitizeNickname, theoreticalMaxScore } from '../config/constants.js';
import { STAGES } from '../config/index.js';
import { Storage } from '../systems/Storage.js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function isOnline() {
  return Boolean(URL && KEY);
}

export function maxAllowedScore() {
  return theoreticalMaxScore(Object.values(STAGES));
}

// 클라이언트 1차 검증 (서버 검증과 동일 규칙 — §6 ①②③④)
export function validateSubmission({ nickname, score, play_ms }) {
  const nick = sanitizeNickname(nickname);
  if (!nick.ok && !nick.value) return { ok: false, reason: nick.reason };
  if (!Number.isFinite(score) || score < 0) return { ok: false, reason: '점수가 올바르지 않아요.' };
  if (score > maxAllowedScore()) return { ok: false, reason: '점수가 이론상 최대치를 넘었어요.' };
  if (!Number.isFinite(play_ms) || play_ms < RANK_LIMITS.minPlayMs) {
    return { ok: false, reason: '플레이 시간이 너무 짧아요.' };
  }
  if (score / (play_ms / 1000) > RANK_LIMITS.maxScorePerSecond) {
    return { ok: false, reason: '시간 대비 점수가 비정상이에요.' };
  }
  const last = Storage.getLastSubmit();
  if (Date.now() - last < RANK_LIMITS.submitCooldownMs) {
    return { ok: false, reason: '잠시 후 다시 제출해 주세요.' };
  }
  return { ok: true, nickname: nick.value };
}

function headers() {
  return {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
  };
}

function saveLocal(entry) {
  const list = Storage.getLocalRanking();
  list.push({ ...entry, created_at: new Date().toISOString() });
  list.sort((a, b) => b.score - a.score);
  Storage.setLocalRanking(list.slice(0, 50));
}

export async function submitScore({ nickname, score, play_ms, mode = 'stage' }) {
  const v = validateSubmission({ nickname, score, play_ms });
  if (!v.ok) return { ok: false, reason: v.reason };
  const entry = { nickname: v.nickname, score: Math.floor(score), mode, play_ms: Math.floor(play_ms) };
  Storage.setLastSubmit(Date.now());
  saveLocal(entry);

  if (!isOnline()) return { ok: true, local: true };

  try {
    const res = await fetch(`${URL}/rest/v1/scores`, {
      method: 'POST',
      headers: { ...headers(), Prefer: 'return=minimal' },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true, local: false };
  } catch (err) {
    // §11: 제출 실패 시 로컬 보관 후 재시도
    const pending = Storage.getPendingScores();
    pending.push(entry);
    Storage.setPendingScores(pending.slice(-10));
    return { ok: false, reason: '서버 전송 실패 — 기기에 보관했어요. 다음 접속 때 재시도합니다.', queued: true };
  }
}

export async function retryPending() {
  if (!isOnline()) return;
  const pending = Storage.getPendingScores();
  if (!pending.length) return;
  const remain = [];
  for (const entry of pending) {
    try {
      const res = await fetch(`${URL}/rest/v1/scores`, {
        method: 'POST',
        headers: { ...headers(), Prefer: 'return=minimal' },
        body: JSON.stringify(entry),
      });
      if (!res.ok) remain.push(entry);
    } catch {
      remain.push(entry);
    }
  }
  Storage.setPendingScores(remain);
}

export async function fetchTop(limit = RANK_LIMITS.boardSize, mode = 'stage') {
  if (!isOnline()) {
    return { ok: true, local: true, rows: Storage.getLocalRanking().slice(0, limit) };
  }
  try {
    const q = `${URL}/rest/v1/scores?select=nickname,score,created_at&mode=eq.${mode}&order=score.desc,created_at.asc&limit=${limit}`;
    const res = await fetch(q, { headers: headers() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    return { ok: true, local: false, rows };
  } catch (err) {
    return { ok: false, local: true, rows: Storage.getLocalRanking().slice(0, limit), reason: '서버 연결 실패 — 이 기기 기록을 보여드려요.' };
  }
}
