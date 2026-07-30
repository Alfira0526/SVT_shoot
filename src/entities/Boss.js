import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/constants.js';

// 보스 (§3.5) — 데이터 기반 3페이즈. HP바 = 대기열 숫자 감소 연출.
export class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, config) {
    // 보스 텍스처 맵 (D34 scalper 추가). super 선행 제약으로 인라인.
    super(scene, GAME_WIDTH / 2, -80, { server: 'boss_server', noise: 'boss_noise', scalper: 'boss_scalper' }[config.portrait] || 'boss_noise');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.cfg = config;
    this.maxHp = config.hp;
    this.hp = config.hp;
    this.phases = config.phases;
    this.phaseIndex = 0;
    this.alive = true;
    this._nextShot = 0;
    this._enterDone = false;
    this._dir = 1;

    this.body.setSize(this.width * 0.7, this.height * 0.6);
    this.setDepth(5);
  }

  enter(onDone) {
    this.scene.tweens.add({
      targets: this,
      y: 130,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this._enterDone = true;
        onDone?.();
      },
    });
  }

  currentPhase() {
    return this.phases[this.phaseIndex];
  }

  hpRatio() {
    return Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
  }

  takeDamage(dmg) {
    if (!this.alive) return false;
    this.hp -= dmg;
    // 페이즈 전환 판정
    const r = this.hpRatio();
    while (
      this.phaseIndex < this.phases.length - 1 &&
      r <= this.phases[this.phaseIndex].to + 0.0001
    ) {
      this.phaseIndex++;
      this._onPhaseChange();
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true; // 격파
    }
    return false;
  }

  _onPhaseChange() {
    // "새로고침" 등 페이즈 진입 플래시
    this.scene.cameras.main.flash(180, 255, 255, 255, false);
    this.scene.tweens.add({ targets: this, alpha: 0.3, duration: 60, yoyo: true, repeat: 3 });
  }

  update(time) {
    if (!this._enterDone || !this.alive) return;

    // 좌우 배회
    this.x += this._dir * 0.9;
    if (this.x > GAME_WIDTH - 70) this._dir = -1;
    if (this.x < 70) this._dir = 1;

    const ph = this.currentPhase();
    if (time > this._nextShot) {
      this._nextShot = time + ph.intervalMs;
      this._firePattern(ph, time);
      if (ph.summon) this.scene.summonEnemy?.(ph.summon);
    }
  }

  _firePattern(ph, time) {
    const cx = this.x;
    const cy = this.y + 30;
    const speed = ph.speed;
    switch (ph.pattern) {
      case 'fan': {
        // 부채꼴 아래방향
        const spread = Phaser.Math.DegToRad(90);
        const start = Math.PI / 2 - spread / 2;
        for (let i = 0; i < ph.count; i++) {
          const a = start + (spread * i) / (ph.count - 1);
          this.scene.enemyFireAt?.(cx, cy, Math.cos(a) * speed, Math.sin(a) * speed);
        }
        break;
      }
      case 'spread': {
        const off = Phaser.Math.DegToRad(30);
        const start = Math.PI / 2 - off;
        for (let i = 0; i < ph.count; i++) {
          const a = start + ((off * 2) * i) / (ph.count - 1);
          this.scene.enemyFireAt?.(cx, cy, Math.cos(a) * speed, Math.sin(a) * speed);
        }
        break;
      }
      case 'refresh': {
        // 화면 플래시 후 랜덤 재배치 탄
        this.scene.cameras.main.flash(120, 200, 220, 255, false);
        for (let i = 0; i < ph.count; i++) {
          const x = Phaser.Math.Between(20, GAME_WIDTH - 20);
          this.scene.enemyFireAt?.(x, -10, 0, speed);
        }
        break;
      }
      case 'rage': {
        // 전방위 탄막
        for (let i = 0; i < ph.count; i++) {
          const a = (Math.PI * 2 * i) / ph.count + time * 0.0004;
          this.scene.enemyFireAt?.(cx, this.y, Math.cos(a) * speed, Math.sin(a) * speed);
        }
        break;
      }
    }
  }

  defeatSequence(onDone) {
    this.alive = false;
    const scene = this.scene;
    let blasts = 0;
    const t = scene.time.addEvent({
      delay: 120,
      repeat: 9,
      callback: () => {
        blasts++;
        scene.spawnExplosion?.(
          this.x + Phaser.Math.Between(-30, 30),
          this.y + Phaser.Math.Between(-30, 30),
          Phaser.Math.FloatBetween(0.8, 1.4)
        );
        if (blasts >= 10) {
          t.remove();
          this.setVisible(false);
          onDone?.();
        }
      },
    });
  }
}
