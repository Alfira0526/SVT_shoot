import { NICKNAME, BANNED_WORDS, FALLBACK_NAME } from '../config/constants.js';

// 닉네임 금칙어·길이 필터 (§6 ④, 인수인계 §6)
//  - 클라이언트 1차 방어. 서버 이관(v1.5) 시 Edge Function에서 동일 목록 재검증.
//  - 필터 실패/빈 값 → 대사 호칭은 FALLBACK_NAME("신입 수호자")로 대체.

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, '') // 공백 우회 방지
    .replace(/[._\-*]/g, ''); // 흔한 구분자 우회 방지
}

export function containsBanned(name) {
  const n = normalize(name);
  return BANNED_WORDS.some((w) => n.includes(normalize(w)));
}

/**
 * 닉네임 유효성 검사.
 * @returns {{ ok:boolean, reason?:'length'|'banned' }}
 */
export function validateNickname(name) {
  const trimmed = String(name || '').trim();
  if (trimmed.length < NICKNAME.min || trimmed.length > NICKNAME.max) {
    return { ok: false, reason: 'length' };
  }
  if (containsBanned(trimmed)) {
    return { ok: false, reason: 'banned' };
  }
  return { ok: true };
}

// 대사·보드에 노출할 안전한 표시명 — 유효하지 않으면 대체 호칭.
export function safeDisplayName(name) {
  return validateNickname(name).ok ? String(name).trim() : FALLBACK_NAME;
}
