import { Save } from './SaveSystem.js';

// 사운드 시스템 (§5.4 / D18) — WebAudio 로 전부 절차 생성(오실레이터·노이즈).
//   외부 음원·기존 멜로디 일절 미사용 → 라이선스·저작권 원천 차단(§7).
//   설정(fs_settings.bgm/sfx) 연동. 브라우저 자동재생 정책 상 최초 사용자 제스처 후 unlock() 필요.

class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.bgmTimer = null;
    this.bgmStep = 0;
    const s = Save.getSettings();
    this.bgmOn = s.bgm;
    this.sfxOn = s.sfx;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
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
    this.bgmGain.gain.value = this.bgmOn ? 0.28 : 0;
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
    if (this.bgmGain) this.bgmGain.gain.value = on ? 0.28 : 0;
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
      default: break;
    }
  }

  // ── BGM: 절차 생성 칩튠 루프 (미해결 텐션 없는 마이너 펜타토닉 아르페지오) ──
  startBgm() {
    if (!this.ctx || this.bgmTimer) return;
    // A 마이너 펜타토닉 저음 베이스 + 아르페지오 (16스텝)
    const bass = [220, 220, 165, 196]; // A A E G
    const arp = [440, 523, 659, 587, 440, 523, 494, 587];
    const stepMs = 200;
    this.bgmStep = 0;
    this.bgmTimer = setInterval(() => {
      if (!this.ctx || !this.bgmOn) return;
      const s = this.bgmStep;
      // 베이스 (매 4스텝)
      if (s % 4 === 0) this._bgmNote(bass[(s / 4) % bass.length], 0.7, 'triangle', 0.5);
      // 아르페지오 (매 스텝)
      this._bgmNote(arp[s % arp.length], 0.16, 'square', 0.22);
      this.bgmStep = (s + 1) % 16;
    }, stepMs);
  }

  _bgmNote(freq, dur, type, vol) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.bgmGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  stopBgm() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const Audio = new GameAudio();
