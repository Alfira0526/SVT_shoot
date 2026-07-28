import { STORAGE, NICKNAME } from '../config/constants.js';

// 진행도 저장 (§5.5 / 인수인계 §5) — v1 localStorage.
// 키 구조는 v2 Supabase progress 테이블 컬럼과 1:1 대응(D28, 마이그레이션 비용 최소화):
//   fs_nickname            → progress.nickname
//   fs_progress            → { clearedStages[], bestScore, noMissClear }
//   fs_settings            → { bgm, sfx }

const DEFAULT_PROGRESS = { clearedStages: [], bestScore: 0, noMissClear: false };
const DEFAULT_SETTINGS = { bgm: true, sfx: true };

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // 프라이빗 모드 등 — 저장 실패는 무시
  }
}

export const Save = {
  getNickname() {
    return read(STORAGE.nickname, '');
  },
  setNickname(name) {
    const clean = String(name || '').trim().slice(0, NICKNAME.max);
    write(STORAGE.nickname, clean);
    return clean;
  },

  getProgress() {
    return { ...DEFAULT_PROGRESS, ...read(STORAGE.progress, {}) };
  },
  markStageCleared(stageId) {
    const p = this.getProgress();
    if (!p.clearedStages.includes(stageId)) p.clearedStages.push(stageId);
    write(STORAGE.progress, p);
    return p;
  },
  isStageCleared(stageId) {
    return this.getProgress().clearedStages.includes(stageId);
  },
  // 최고 점수·노미스 클리어 기록 갱신 (게임 종료 시 호출)
  recordRun({ score = 0, noMiss = false } = {}) {
    const p = this.getProgress();
    if (score > p.bestScore) p.bestScore = score;
    if (noMiss) p.noMissClear = true;
    write(STORAGE.progress, p);
    return p;
  },

  getSettings() {
    return { ...DEFAULT_SETTINGS, ...read(STORAGE.settings, {}) };
  },
  setSettings(partial) {
    const s = { ...this.getSettings(), ...partial };
    write(STORAGE.settings, s);
    return s;
  },
};
