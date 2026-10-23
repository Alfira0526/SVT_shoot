// D28 — v1 진행도 저장: localStorage. 키 구조는 v2 Supabase progress 테이블과 1:1 대응.
import { STORAGE_KEYS as K } from '../config/constants.js';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 사생활 모드 등 — 저장 실패는 치명적이지 않음 */
  }
}

const DEFAULT_PROGRESS = () => ({
  clearedStages: [],
  bestScore: 0,
  noMissClear: false,
  prologueSeen: false,
});

export const Storage = {
  getNickname() {
    return read(K.nickname, null);
  },
  setNickname(name) {
    write(K.nickname, name);
  },

  getProgress() {
    return { ...DEFAULT_PROGRESS(), ...read(K.progress, {}) };
  },
  updateProgress(patch) {
    const next = { ...this.getProgress(), ...patch };
    write(K.progress, next);
    return next;
  },
  markStageCleared(stageId) {
    const p = this.getProgress();
    if (!p.clearedStages.includes(stageId)) p.clearedStages.push(stageId);
    write(K.progress, p);
    return p;
  },

  getSettings() {
    return { bgm: true, sfx: true, ...read(K.settings, {}) };
  },
  setSettings(settings) {
    write(K.settings, settings);
  },

  getTutorialSeen() {
    return read(K.tutorialSeen, false);
  },
  setTutorialSeen() {
    write(K.tutorialSeen, true);
  },

  getLocalRanking() {
    return read(K.localRanking, []);
  },
  setLocalRanking(list) {
    write(K.localRanking, list);
  },

  getPendingScores() {
    return read(K.pendingScores, []);
  },
  setPendingScores(list) {
    write(K.pendingScores, list);
  },

  getLastSubmit() {
    return read(K.lastSubmit, 0);
  },
  setLastSubmit(ts) {
    write(K.lastSubmit, ts);
  },
};
