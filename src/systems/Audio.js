import { Save } from './SaveSystem.js';

// 사운드 시스템 (§5.4 / D18) — WebAudio 로 전부 절차 생성(오실레이터·노이즈).
//   외부 음원·기존 멜로디 일절 미사용 → 라이선스·저작권 원천 차단(§7).
//   설정(fs_settings.bgm/sfx) 연동. 브라우저 자동재생 정책 상 최초 사용자 제스처 후 unlock() 필요.
//
// BGM은 장면 분위기별 트랙(아래 TRACKS)을 playTrack(name)으로 전환한다.
//   title    — 꿈결 같은 느린 아르페지오 (타이틀·랭킹·도감)
//   prologue — 성긴 오르골 (프롤로그 컷씬)
//   world    — 밝은 펜타토닉 행진 (세계 전투; 세계마다 조옮김)
//   boss     — 단조 질주 (보스전)
//   final    — 더 빠르고 무거운 결전 (독점자·무결)
//   endless  — 당김음 드라이브 (엔들리스)
// 모두 이 프로젝트용으로 새로 쓴 짧은 루프. MIDI 노트 번호, null = 쉼표, 16분음표 단위.

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

const TRACKS = {
  title: {
    bpm: 96, lead: 'triangle', leadVol: 0.12, bass: 'sine', bassVol: 0.16, hat: false,
    bassSeq: [48, 48, 55, 55, 52, 52, 57, 57],
    leadSeq: [
      72, null, 76, 79, null, 83, 79, null, 72, null, 76, 79, 84, null, 79, null,
      69, null, 72, 76, null, 79, 76, null, 71, null, 74, 77, null, 81, 77, null,
    ],
  },
  prologue: {
    bpm: 84, lead: 'sine', leadVol: 0.14, bass: 'triangle', bassVol: 0.1, hat: false,
    bassSeq: [45, 45, 41, 41, 43, 43, 40, 40],
    leadSeq: [
      69, null, null, 72, null, null, 76, null, null, 72, null, null, 69, null, null, null,
      65, null, null, 69, null, null, 72, null, null, 71, null, null, 67, null, null, null,
    ],
  },
  world: {
    bpm: 132, lead: 'square', leadVol: 0.09, bass: 'triangle', bassVol: 0.16, hat: true,
    bassSeq: [45, 45, 45, 47, 48, 48, 48, 43],
    leadSeq: [
      69, 72, 76, null, 72, 76, 79, null, 71, 74, 77, null, 74, 77, 81, null,
      72, 76, 79, null, 76, 79, 84, null, 67, 71, 74, null, 71, 74, 79, null,
    ],
  },
  boss: {
    bpm: 152, lead: 'sawtooth', leadVol: 0.07, bass: 'square', bassVol: 0.12, hat: true,
    bassSeq: [38, 38, 38, 41, 38, 38, 45, 44],
    leadSeq: [
      74, 74, null, 77, 74, null, 81, null, 74, 74, null, 77, 80, null, 77, null,
      72, 72, null, 75, 72, null, 79, null, 72, 72, null, 75, 78, null, 75, null,
    ],
  },
  final: {
    bpm: 162, lead: 'sawtooth', leadVol: 0.08, bass: 'square', bassVol: 0.14, hat: true,
    bassSeq: [36, 36, 43, 43, 39, 39, 41, 41],
    leadSeq: [
      72, null, 72, 75, null, 79, 75, 72, 70, null, 70, 74, null, 77, 74, 70,
      67, null, 67, 70, null, 75, 70, 67, 65, 68, 72, 68, 72, 77, 80, null,
    ],
  },
  endless: {
    bpm: 144, lead: 'square', leadVol: 0.08, bass: 'triangle', bassVol: 0.15, hat: true,
    bassSeq: [40, 40, 47, 47, 43, 43, 45, 45],
    leadSeq: [
      76, null, 76, 79, null, 83, 79, 76, 74, null, 74, 78, null, 81, 78, 74,
      71, null, 71, 74, null, 79, 74, 71, 69, 72, 76, 72, 76, 81, 84, null,
    ],
  },
};

class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.bgmTimer = null;
    this.track = 'title';
    this.transpose = 0;
    this._step = 0;
    this._nextTime = 0;
    const s = Save.getSettings();
    this.bgmOn = s.bgm;
    this.sfxOn = s.sfx;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (this.bgmOn && !this.bgmTimer) this.startBgm();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxOn ? 0.6 : 0;
    this.sfxGain.connect(this.master);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = this.bgmOn ? 0.3 : 0;
    this.bgmGain.connect(this.master);

    if (this.bgmOn) this.startBgm();
  }

  setSfx(on) {
    this.sfxOn = on;
    Save.setSettings({ sfx: on });
    if (this.sfxGain) this.sfxGain.gain.value = on ? 0.6 : 0;
  }

  setBgm(on) {
    this.bgmOn = on;
    Save.setSettings({ bgm: on });
    if (!this.ctx) return;
    if (this.bgmGain) this.bgmGain.gain.value = on ? 0.3 : 0;
    if (on && !this.bgmTimer) this.startBgm();
    if (!on && this.bgmTimer) this.stopBgm();
  }

  // ── SFX ────────────────────────────────────────────────
  _tone(freq, dur, type = 'square', vol = 0.5, slideTo = null) {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _noise(dur, vol = 0.5, filterHz = 1200) {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = filterHz;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(lp);
    lp.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur);
  }

  sfx(name) {
    switch (name) {
      case 'shoot': this._tone(880, 0.06, 'square', 0.18, 1400); break;
      case 'hitEnemy': this._tone(320, 0.05, 'square', 0.25, 160); break;
      case 'playerHit': this._noise(0.25, 0.5, 900); this._tone(200, 0.25, 'sawtooth', 0.3, 60); break;
      case 'explode': this._noise(0.4, 0.6, 1600); break;
      case 'powerup': this._tone(520, 0.09, 'square', 0.3); setTimeout(() => this._tone(780, 0.12, 'square', 0.3), 90); break;
      case 'life': this._tone(660, 0.1, 'triangle', 0.3); setTimeout(() => this._tone(990, 0.14, 'triangle', 0.3), 100); break;
      case 'shield': this._tone(440, 0.18, 'sine', 0.35, 880); break;
      case 'clear':
        [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._tone(f, 0.18, 'square', 0.3), i * 110));
        break;
      case 'gameover':
        [392, 330, 262].forEach((f, i) => setTimeout(() => this._tone(f, 0.3, 'sawtooth', 0.3), i * 180));
        break;
      case 'ui': this._tone(700, 0.05, 'square', 0.2); break;
      case 'warning':
        [0, 220].forEach((d) => setTimeout(() => this._tone(220, 0.18, 'sawtooth', 0.28, 180), d));
        break;
      default: break;
    }
  }

  // ── BGM 트랙 전환 ──────────────────────────────────────
  // name: TRACKS 키. transpose: 반음 단위 조옮김(세계별 변주용).
  playTrack(name, transpose = 0) {
    if (!TRACKS[name]) name = 'title';
    if (this.track === name && this.transpose === transpose && this.bgmTimer) return;
    this.track = name;
    this.transpose = transpose;
    if (!this.ctx) return; // unlock 때 시작
    this.stopBgm();
    if (this.bgmOn) this.startBgm();
  }

  startBgm() {
    if (!this.ctx || this.bgmTimer) return;
    this._step = 0;
    this._nextTime = this.ctx.currentTime + 0.05;
    this.bgmTimer = setInterval(() => this._schedule(), 25);
  }

  stopBgm() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  _schedule() {
    if (!this.ctx || !this.bgmOn) return;
    const tr = TRACKS[this.track];
    const stepDur = 60 / tr.bpm / 4;
    // 25ms 간격 폴링 + 120ms 룩어헤드 — 탭 전환 등으로 지연돼도 박자가 밀리지 않음
    while (this._nextTime < this.ctx.currentTime + 0.12) {
      this._playStep(tr, this._step, this._nextTime, stepDur);
      this._step += 1;
      this._nextTime += stepDur;
    }
  }

  _playStep(tr, step, time, stepDur) {
    const lead = tr.leadSeq[step % tr.leadSeq.length];
    const bass = tr.bassSeq[Math.floor(step / 2) % tr.bassSeq.length];
    if (lead != null) this._bgmNote(midi(lead + this.transpose), stepDur * 0.9, tr.lead, tr.leadVol, time);
    if (step % 2 === 0) this._bgmNote(midi(bass + this.transpose), stepDur * 1.7, tr.bass, tr.bassVol, time);
    if (tr.hat && step % 4 === 2) this._bgmHat(time);
  }

  _bgmNote(freq, dur, type, vol, time) {
    const t = Math.max(time, this.ctx.currentTime);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.bgmGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _bgmHat(time) {
    const t = Math.max(time, this.ctx.currentTime);
    const n = Math.floor(this.ctx.sampleRate * 0.03);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    src.connect(g);
    g.connect(this.bgmGain);
    src.start(t);
  }
}

export const Audio = new GameAudio();

// 탭이 가려지면 BGM 시퀀서 정지(백그라운드에서 소리가 계속 나는 것 방지), 돌아오면 재개.
// iOS 사파리는 touchend에서만 오디오가 풀리는 경우가 있어 unlock 리스너도 함께 등록.
if (typeof window !== 'undefined') {
  const unlock = () => Audio.unlock();
  window.addEventListener('pointerup', unlock, { passive: true });
  window.addEventListener('touchend', unlock, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!Audio.ctx) return;
    if (document.hidden) {
      Audio._wasPlaying = Boolean(Audio.bgmTimer);
      Audio.stopBgm();
      Audio.ctx.suspend?.();
    } else {
      Audio.ctx.resume?.();
      if (Audio._wasPlaying && Audio.bgmOn) Audio.startBgm();
      Audio._wasPlaying = false;
    }
  });
}
