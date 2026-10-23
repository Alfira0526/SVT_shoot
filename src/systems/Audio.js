// D18 / §5 사운드 — 효과음·BGM 모두 WebAudio로 자체 생성한 오리지널 칩튠.
// 기존 곡 멜로디 커버·편곡 없음. 외부 오디오 파일 불필요.
import { Storage } from './Storage.js';

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// 16분음표 단위 시퀀스. null = 쉼표. 숫자 = MIDI 노트.
// 모두 이 프로젝트용으로 새로 쓴 짧은 루프.
const SONGS = {
  title: {
    bpm: 108,
    bass: [45, 45, 52, 52, 48, 48, 55, 55],
    lead: [
      69, null, 72, 76, null, 76, 72, null, 69, null, 72, 76, 79, null, 76, null,
      65, null, 69, 72, null, 72, 69, null, 67, null, 71, 74, null, 71, 67, null,
    ],
  },
  w1: {
    bpm: 128,
    bass: [45, 45, 45, 47, 48, 48, 48, 43],
    lead: [
      69, 72, 76, null, 72, 76, 79, null, 71, 74, 77, null, 74, 77, 81, null,
      72, 76, 79, null, 76, 79, 84, null, 67, 71, 74, null, 71, 74, 79, null,
    ],
  },
  w2: {
    bpm: 144,
    bass: [40, 40, 47, 47, 43, 43, 45, 45],
    lead: [
      76, null, 76, 79, null, 83, 79, 76, 74, null, 74, 78, null, 81, 78, 74,
      71, null, 71, 74, null, 79, 74, 71, 69, 72, 76, 72, 76, 81, 84, null,
    ],
  },
  boss: {
    bpm: 156,
    bass: [38, 38, 38, 41, 38, 38, 45, 44],
    lead: [
      74, 74, null, 77, 74, null, 81, null, 74, 74, null, 77, 80, null, 77, null,
      72, 72, null, 75, 72, null, 79, null, 72, 72, null, 75, 78, null, 75, null,
    ],
  },
};

class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.settings = Storage.getSettings();
    this.song = null;
    this.songName = null;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
  }

  // 브라우저 자동재생 정책 — 첫 사용자 입력에서 호출
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.connect(this.master);
      this.applySettings(this.settings);
      if (this.pendingSong) this.playBgm(this.pendingSong);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  applySettings(settings) {
    this.settings = settings;
    Storage.setSettings(settings);
    if (this.sfxGain) this.sfxGain.gain.value = settings.sfx ? 1 : 0;
    if (this.bgmGain) this.bgmGain.gain.value = settings.bgm ? 0.32 : 0;
  }

  tone({ type = 'square', freq = 440, to = null, dur = 0.1, vol = 0.25, delay = 0, dest = null }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(dest || this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  noise({ dur = 0.3, vol = 0.25, delay = 0, lowpass = 2400 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  sfx(name) {
    if (!this.ctx || !this.settings.sfx) return;
    switch (name) {
      case 'shoot':
        this.tone({ type: 'square', freq: 960, to: 520, dur: 0.05, vol: 0.05 });
        break;
      case 'hit':
        this.tone({ type: 'sawtooth', freq: 240, to: 120, dur: 0.07, vol: 0.08 });
        break;
      case 'explode':
        this.noise({ dur: 0.28, vol: 0.18 });
        this.tone({ type: 'triangle', freq: 160, to: 40, dur: 0.3, vol: 0.2 });
        break;
      case 'bossHit':
        this.tone({ type: 'square', freq: 330, to: 200, dur: 0.05, vol: 0.05 });
        break;
      case 'bossExplode':
        this.noise({ dur: 1.2, vol: 0.3, lowpass: 1200 });
        this.tone({ type: 'sawtooth', freq: 120, to: 30, dur: 1.1, vol: 0.3 });
        break;
      case 'playerHit':
        this.noise({ dur: 0.45, vol: 0.3 });
        this.tone({ type: 'sawtooth', freq: 400, to: 60, dur: 0.45, vol: 0.25 });
        break;
      case 'item':
        [523, 659, 784].forEach((f, i) => this.tone({ type: 'square', freq: f, dur: 0.08, vol: 0.12, delay: i * 0.06 }));
        break;
      case 'life':
        [659, 784, 988, 1319].forEach((f, i) => this.tone({ type: 'triangle', freq: f, dur: 0.12, vol: 0.16, delay: i * 0.08 }));
        break;
      case 'shield':
        this.tone({ type: 'sine', freq: 440, to: 880, dur: 0.25, vol: 0.15 });
        break;
      case 'click':
        this.tone({ type: 'square', freq: 740, dur: 0.045, vol: 0.09 });
        break;
      case 'blip':
        this.tone({ type: 'square', freq: 1400, dur: 0.02, vol: 0.035 });
        break;
      case 'flip':
        this.tone({ type: 'triangle', freq: 600, to: 1200, dur: 0.18, vol: 0.14 });
        break;
      case 'jackpot':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone({ type: 'square', freq: f, dur: 0.14, vol: 0.14, delay: i * 0.07 }));
        break;
      case 'glitch':
        this.noise({ dur: 0.2, vol: 0.2, lowpass: 5000 });
        this.tone({ type: 'square', freq: 90, to: 1800, dur: 0.12, vol: 0.08 });
        break;
      case 'warning':
        [0, 0.22].forEach((d) => this.tone({ type: 'sawtooth', freq: 220, to: 180, dur: 0.18, vol: 0.14, delay: d }));
        break;
      case 'refresh':
        this.tone({ type: 'sine', freq: 1500, to: 300, dur: 0.3, vol: 0.14 });
        break;
      case 'clear':
        [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone({ type: 'square', freq: f, dur: 0.16, vol: 0.14, delay: i * 0.09 }));
        break;
      case 'gameover':
        [392, 370, 349, 330].forEach((f, i) => this.tone({ type: 'triangle', freq: f, dur: 0.35, vol: 0.18, delay: i * 0.3 }));
        break;
      default:
        break;
    }
  }

  // ---------- BGM 시퀀서 ----------
  playBgm(name) {
    if (!SONGS[name]) return;
    if (!this.ctx) {
      this.pendingSong = name;
      return;
    }
    if (this.songName === name && this.timer) return;
    this.stopBgm();
    this.song = SONGS[name];
    this.songName = name;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.05;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stopBgm() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.song = null;
    this.songName = null;
    this.pendingSong = null;
  }

  schedule() {
    if (!this.ctx || !this.song) return;
    const stepDur = 60 / this.song.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime, stepDur);
      this.step++;
      this.nextTime += stepDur;
    }
  }

  playStep(step, time, stepDur) {
    const { bass, lead } = this.song;
    const leadNote = lead[step % lead.length];
    const bassNote = bass[Math.floor(step / 2) % bass.length];
    const delay = Math.max(0, time - this.ctx.currentTime);
    if (leadNote != null) {
      this.tone({ type: 'square', freq: midi(leadNote), dur: stepDur * 0.9, vol: 0.09, delay, dest: this.bgmGain });
    }
    if (step % 2 === 0) {
      this.tone({ type: 'triangle', freq: midi(bassNote), dur: stepDur * 1.6, vol: 0.16, delay, dest: this.bgmGain });
    }
    if (step % 4 === 2) {
      // 하이햇 대용 짧은 노이즈
      const t = time;
      const len = Math.floor(this.ctx.sampleRate * 0.03);
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const g = this.ctx.createGain();
      g.gain.value = 0.05;
      src.connect(g);
      g.connect(this.bgmGain);
      src.start(t);
    }
  }
}

export const Audio = new AudioSystem();

// 첫 입력에서 오디오 컨텍스트 해제 (iOS Safari는 touchend에서만 풀리는 경우가 있어 함께 등록)
if (typeof window !== 'undefined') {
  const unlock = () => Audio.unlock();
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('pointerup', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('touchend', unlock, { passive: true });

  // 탭이 숨겨지면 BGM 시퀀서 정지 (백그라운드에서 소리가 계속 나는 것 방지), 돌아오면 재개
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      Audio.suspendedSong = Audio.songName;
      Audio.stopBgm();
      Audio.ctx?.suspend?.();
    } else {
      Audio.ctx?.resume?.();
      if (Audio.suspendedSong) {
        Audio.playBgm(Audio.suspendedSong);
        Audio.suspendedSong = null;
      }
    }
  });
}
