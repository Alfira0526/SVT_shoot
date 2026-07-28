import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/constants.js';
import { spawnQueueSurge } from '../entities/Enemy.js';

// 웨이브 스포너 (§3.1, §9-3) — stageXX.json의 waves 배열을 타임라인으로 소비.
// 모든 웨이브 소진 후 onComplete 콜백 → 씬이 보스 시퀀스로 전환.
export class WaveSpawner {
  constructor(scene, stage, handlers) {
    this.scene = scene;
    this.stage = stage;
    this.handlers = handlers; // { spawnEnemy, spawnItem, midPattern }
    this.timers = [];
    this.done = false;
    this.totalMobs = 0;
  }

  // 스테이지 총 잡몹 수 — 이론상 최대 점수 산출(T7)에 사용
  countMobs() {
    let n = 0;
    for (const w of this.stage.waves) {
      if (w.enemies) n += w.enemies.length;
    }
    // 중간 패턴/보스 소환분은 상한 여유로 별도 미포함(보수적)
    return n;
  }

  start(onComplete) {
    this.totalMobs = this.countMobs();
    const waves = this.stage.waves;
    let last = 0;
    for (const w of waves) {
      last = Math.max(last, w.at);
      const t = this.scene.time.delayedCall(w.at, () => this._runWave(w));
      this.timers.push(t);
    }
    // 마지막 웨이브 뒤 여유 시간 후 보스 진입
    const end = this.scene.time.delayedCall(last + 2600, () => {
      this.done = true;
      onComplete?.();
    });
    this.timers.push(end);
  }

  _runWave(w) {
    if (w.enemies) {
      for (const e of w.enemies) {
        this.handlers.spawnEnemy(e.type, Phaser.Math.Clamp(e.x, 0.05, 0.95) * GAME_WIDTH, -20);
      }
    }
    if (w.item) {
      this.handlers.spawnItem(w.item, Phaser.Math.Clamp(w.itemX ?? 0.5, 0.05, 0.95) * GAME_WIDTH);
    }
    if (w.midPattern === 'queue_surge') {
      spawnQueueSurge(this.scene);
    }
  }

  destroy() {
    this.timers.forEach((t) => t.remove(false));
    this.timers = [];
  }
}
