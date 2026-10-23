import Phaser from 'phaser';
import { GAME_W } from '../config/constants.js';

// §9 3단계 — stage JSON의 waves 배열만으로 잡몹 웨이브 재생.
// 웨이브 종료 조건: 소환한 적이 전멸 또는 maxWait 경과 → 다음 웨이브(delay 후).
export default class WaveSpawner {
  constructor(scene, stage) {
    this.scene = scene;
    this.waves = stage.waves || [];
    this.waveIdx = -1;
    this.running = false;
    this.waiting = false;
    this.deadline = 0;
    this.spawnedAll = false;
    this.timers = [];
  }

  start() {
    this.running = true;
    this.next();
  }

  stop() {
    this.running = false;
    this.timers.forEach((t) => t.remove(false));
    this.timers = [];
  }

  next() {
    if (!this.running) return;
    this.waveIdx += 1;
    this.waiting = false;
    if (this.waveIdx >= this.waves.length) {
      this.running = false;
      this.scene.events.emit('waves-complete');
      return;
    }
    const wave = this.waves[this.waveIdx];
    this.scene.events.emit('wave-start', this.waveIdx + 1, this.waves.length);
    this.timers.push(this.scene.time.delayedCall(wave.delay ?? 1000, () => this.runWave(wave)));
  }

  runWave(wave) {
    let lastSpawnAt = 0;
    for (const spawn of wave.spawns || []) {
      const startDelay = spawn.startDelay ?? 0;
      const interval = spawn.interval ?? 500;
      for (let k = 0; k < (spawn.count ?? 1); k++) {
        const at = startDelay + k * interval;
        lastSpawnAt = Math.max(lastSpawnAt, at);
        const isLast = k === (spawn.count ?? 1) - 1;
        this.timers.push(
          this.scene.time.delayedCall(at, () => {
            const x = this.pickX(spawn, k);
            this.scene.spawnEnemy(spawn.type, x, -30, { drop: isLast ? spawn.drop : null });
          })
        );
      }
    }
    // 전원 소환 후 전멸 대기
    this.timers.push(
      this.scene.time.delayedCall(lastSpawnAt + 50, () => {
        this.waiting = true;
        this.deadline = this.scene.time.now + (wave.maxWait ?? 9000);
      })
    );
  }

  pickX(spawn, k) {
    if (Array.isArray(spawn.x) && spawn.x.length === 2) {
      return Phaser.Math.Between(spawn.x[0], spawn.x[1]);
    }
    if (Array.isArray(spawn.x)) return spawn.x[k % spawn.x.length];
    if (typeof spawn.x === 'number') return spawn.x;
    return Phaser.Math.Between(40, GAME_W - 40);
  }

  update() {
    if (!this.running || !this.waiting) return;
    const alive = this.scene.enemies.countActive(true);
    if (alive === 0 || this.scene.time.now >= this.deadline) {
      this.next();
    }
  }
}
