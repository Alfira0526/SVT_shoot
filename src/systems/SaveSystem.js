import { STORAGE, NICKNAME } from '../config/constants.js';

// 진행도 저장 (§5.5 / 인수인계 §5) — v1 localStorage.
// 키 구조는 v2 Supabase progress 테이블 컬럼과 1:1 대응(D28, 마이그레이션 비용 최소화):
//   fs_nickname            → progress.nickname
//   fs_progress            → { clearedStages[], bestScore, noMissClear }
//   fs_settings            → { bgm, sfx }

const DEFAULT_PROGRESS = {
  clearedStages: [],
  bestScore: 0,
  noMissClear: false,
  prologueSeen: false, // 재방문 시 프롤로그 스킵 (§11)
  tutorialSeen: false, // 첫 조작 안내 오버레이 1회 (§11)
};
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

  // 단발 플래그 (프롤로그·튜토리얼 시청 여부)
  setFlag(key, value = true) {
    const p = this.getProgress();
    p[key] = value;
    write(STORAGE.progress, p);
    return p;
  },
  getFlag(key) {
    return !!this.getProgress()[key];
  },

  // QA 개발자 모드 (무제한 라이프) — 세션 유지용 localStorage 플래그
  getDev() {
    return read(STORAGE.dev, false) === true;
  },
  setDev(on) {
    write(STORAGE.dev, !!on);
    return !!on;
  },

  getSettings() {
    return { ...DEFAULT_SETTINGS, ...read(STORAGE.settings, {}) };
  },
  setSettings(partial) {
    const s = { ...this.getSettings(), ...partial };
    write(STORAGE.settings, s);
    return s;
  },

  // 데이터 초기화 (§11 설정 — 2단계 확인 후 호출). 랭킹 로컬 보드 포함 전체 삭제.
  resetAll() {
    for (const key of Object.values(STORAGE)) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  },
};
