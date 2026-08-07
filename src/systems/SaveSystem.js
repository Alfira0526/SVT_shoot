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
  awakenedGuardians: [], // 각성시킨 수호자 id (봉이는 데이터상 기본 각성)
  guardianExp: {}, // { [id]: 누적 EXP } — 교체 육성
  equippedGuardian: 'bongi', // 함께 비행 중인 수호자(탄 색·패시브)
  worldsCleared: [], // 클리어한 다중세계 id (진행 게이팅)
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

  // ── 수호자 도감 (13인 각성 컬렉션) ──────────────────────
  awakenGuardian(id) {
    const p = this.getProgress();
    p.awakenedGuardians = p.awakenedGuardians || [];
    if (id && !p.awakenedGuardians.includes(id)) p.awakenedGuardians.push(id);
    write(STORAGE.progress, p);
    return p;
  },
  getAwakenedGuardians() {
    return this.getProgress().awakenedGuardians || [];
  },
  isGuardianAwake(id) {
    return this.getAwakenedGuardians().includes(id);
  },

  // 다중세계 진행 (게이팅용)
  getWorldsCleared() {
    return this.getProgress().worldsCleared || [];
  },
  markWorldCleared(id) {
    const p = this.getProgress();
    p.worldsCleared = p.worldsCleared || [];
    if (id && !p.worldsCleared.includes(id)) p.worldsCleared.push(id);
    write(STORAGE.progress, p);
    return p;
  },

  // 교체 육성 — 장착 수호자에 EXP 적립, 장착 슬롯 관리
  getGuardianExp(id) {
    return (this.getProgress().guardianExp || {})[id] || 0;
  },
  addGuardianExp(id, amount) {
    const p = this.getProgress();
    p.guardianExp = p.guardianExp || {};
    p.guardianExp[id] = (p.guardianExp[id] || 0) + Math.max(0, Math.floor(amount || 0));
    write(STORAGE.progress, p);
    return p.guardianExp[id];
  },
  getEquipped() {
    return this.getProgress().equippedGuardian || 'bongi';
  },
  setEquipped(id) {
    const p = this.getProgress();
    p.equippedGuardian = id || 'bongi';
    write(STORAGE.progress, p);
    return p.equippedGuardian;
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

  // ── 엔들리스 모드 성장/기록 (드래곤 플라이트식 무한 루프) ──
  // 별조각(totalGold)은 차기 업그레이드·13인 수호자 해금 재화로 사용.
  getEndless() {
    return { bestDistance: 0, totalGold: 0, runs: 0, ...read(STORAGE.endless, {}) };
  },
  recordEndless({ distance = 0, gold = 0 } = {}) {
    const e = this.getEndless();
    const dist = Math.floor(distance);
    if (dist > e.bestDistance) e.bestDistance = dist;
    e.totalGold = (e.totalGold || 0) + gold;
    e.runs = (e.runs || 0) + 1;
    write(STORAGE.endless, e);
    return e;
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
