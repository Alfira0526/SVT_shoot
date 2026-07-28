import { SCORE } from '../config/constants.js';

// 점수 집계 (§3.7). 노미스 보너스는 클리어 시점에 판정.
export class ScoreSystem {
  constructor() {
    this.score = 0;
    this.mobKills = 0;
    this.bossDamageDealt = 0;
    this.missed = false; // 한 번이라도 피격되면 true → 노미스 보너스 무효
  }

  addMobKill() {
    this.mobKills += 1;
    this.score += SCORE.mobKill;
  }

  addBossTick(damage) {
    // 틱당 10점 (데미지량과 무관하게 유효타 1회 = 1틱)
    this.bossDamageDealt += damage;
    this.score += SCORE.bossTick;
  }

  addBossKill() {
    this.score += SCORE.bossKill;
  }

  markMiss() {
    this.missed = true;
  }

  /** 클리어 정산 — 노미스면 보너스 가산. @returns {number} 최종 점수 */
  finalize() {
    if (!this.missed) this.score += SCORE.noMiss;
    return this.score;
  }
}
