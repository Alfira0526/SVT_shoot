import Phaser from 'phaser';
import { COLORS, CSS, DEPTH, FALLBACK_NICKNAME, GAME_H, GAME_W } from '../config/constants.js';
import { DIALOGUES } from '../config/index.js';
import { Audio } from '../systems/Audio.js';
import { Storage } from '../systems/Storage.js';
import { cutsceneKey } from '../systems/Assets.js';
import { prepareLines } from '../systems/Dialogue.js';
import { drawVerticalGradient } from '../systems/Textures.js';
import { makeButton, textStyle } from '../systems/ui.js';

// D30 — 인터랙티브 프롤로그: 콜드오픈 → 탭 카드 뒤집기 → 메신저 자랑 → 글리치 → 사고 → 봉이 목소리
export default class PrologueScene extends Phaser.Scene {
  constructor() {
    super('Prologue');
  }

  create() {
    this.nickname = Storage.getNickname() || FALLBACK_NICKNAME;
    this.steps = DIALOGUES.prologue.steps;
    this.idx = -1;
    this.done = false;
    this.ignoreUntil = 0;

    this.bg = this.add.container(0, 0).setDepth(DEPTH.backdrop);
    this.layer = this.add.container(0, 0).setDepth(DEPTH.hud);
    this.fader = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 1).setDepth(DEPTH.banner);

    this.skipBtn = makeButton(this, GAME_W - 62, 36, '스킵 ▶▶', () => this.finish(true), {
      w: 100,
      h: 36,
      fontSize: 15,
      color: COLORS.panel,
      textColor: CSS.cream,
    }).setDepth(DEPTH.overlay);

    this.events.on('resume', () => {
      this.ignoreUntil = Date.now() + 250;
    });

    Audio.playBgm('title');
    this.nextStep();
  }

  // ---------- 진행 ----------
  nextStep() {
    if (this.done) return;
    this.idx += 1;
    if (this.idx >= this.steps.length) {
      this.finish(false);
      return;
    }
    const step = this.steps[this.idx];
    this.layer.removeAll(true);
    this.transition(
      step.blackout ? 0.55 : 0,
      () => this.setBackdrop(step.image, step.fallback),
      () => this.runStep(step)
    );
  }

  // 암전 → 배경 교체 → 밝아진 뒤에 스텝 실행 (대사 오버레이가 씬을 일시정지시키므로 페이드가 끝난 뒤 시작)
  transition(restAlpha, setup, after) {
    this.tweens.add({
      targets: this.fader,
      alpha: 1,
      duration: 220,
      onComplete: () => {
        setup();
        this.tweens.add({ targets: this.fader, alpha: restAlpha, duration: 380, onComplete: after });
      },
    });
  }

  runStep(step) {
    switch (step.type) {
      case 'tap_card':
        this.say(step.before, () => this.showCard(step));
        break;
      case 'messenger':
        this.showMessenger(step);
        break;
      default:
        this.say(step.lines, () => this.nextStep());
    }
  }

  say(lines, cb) {
    if (!lines || !lines.length) {
      cb();
      return;
    }
    this.scene.launch('DialogueOverlay', {
      caller: 'Prologue',
      lines: prepareLines(lines, this.nickname),
      onDone: cb,
      onSkip: () => this.finish(true),
    });
    this.scene.pause();
  }

  // ---------- 배경 (D31 폴백: 이미지 없으면 그라데이션 + 실루엣) ----------
  setBackdrop(imagePath, fallback = {}) {
    this.bg.removeAll(true);
    const key = cutsceneKey(this, imagePath);
    if (key) {
      const img = this.add.image(GAME_W / 2, GAME_H / 2, key);
      img.setDisplaySize(GAME_W, GAME_H);
      this.bg.add(img);
      return;
    }
    const g = this.add.graphics();
    drawVerticalGradient(g, 0, 0, GAME_W, GAME_H, fallback.from || CSS.deep, fallback.to || CSS.panel);
    this.bg.add(g);
    this.bg.add(this.add.tileSprite(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 'stars').setAlpha(0.6));
    this.drawSilhouette(fallback.silhouette);
  }

  drawSilhouette(type) {
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 0.85);
    switch (type) {
      case 'crowd': {
        // 인파 실루엣 + 주인공 뒷모습
        for (let i = 0; i < 14; i++) {
          const x = 10 + i * 36 + (i % 2) * 8;
          const h = 90 + ((i * 37) % 60);
          g.fillRoundedRect(x, 520 - h, 30, h + 60, 12);
          g.fillCircle(x + 15, 520 - h - 10, 14);
        }
        g.fillStyle(COLORS.deep, 1);
        g.fillRoundedRect(190, 330, 100, 190, 30);
        g.fillCircle(240, 310, 40);
        // 손에 든 응원봉
        g.fillStyle(COLORS.cream, 1);
        g.fillRect(292, 300, 6, 60);
        this.bg.add(g);
        this.bg.add(this.add.image(295, 290, 'glow').setScale(2.2).setTint(COLORS.lemon));
        // 무대 조명
        for (let i = 0; i < 5; i++) {
          this.bg.add(this.add.image(60 + i * 90, 120, 'glow').setScale(1.6).setTint([COLORS.rose, COLORS.serenity, COLORS.lemon][i % 3]).setAlpha(0.7));
        }
        return;
      }
      case 'booth': {
        g.fillStyle(COLORS.panel, 1);
        g.fillRect(80, 220, 320, 260);
        g.fillStyle(COLORS.rose, 1);
        for (let i = 0; i < 8; i++) g.fillRect(80 + i * 40, 200, 20, 30);
        g.fillStyle(COLORS.cream, 1);
        for (let i = 0; i < 8; i++) g.fillRect(100 + i * 40, 200, 20, 30);
        g.fillStyle(COLORS.ink, 0.9);
        g.fillRect(110, 300, 260, 130);
        this.bg.add(g);
        return;
      }
      case 'lightstick': {
        this.bg.add(g);
        this.bg.add(this.add.image(GAME_W / 2, 330, 'glow').setScale(6).setTint(COLORS.lemon).setAlpha(0.8));
        const stick = this.add.graphics();
        stick.fillStyle(COLORS.cream, 1);
        stick.fillRoundedRect(GAME_W / 2 - 10, 330, 20, 150, 8);
        stick.fillStyle(COLORS.lemon, 1);
        stick.fillCircle(GAME_W / 2, 310, 36);
        stick.fillStyle(COLORS.white, 1);
        stick.fillCircle(GAME_W / 2, 310, 14);
        this.bg.add(stick);
        return;
      }
      default:
        this.bg.add(g);
    }
  }

  // ---------- 탭 카드 뒤집기 ----------
  showCard(step) {
    const card = this.add.image(GAME_W / 2, 330, 'card_back').setScale(1.25);
    const glow = this.add.image(GAME_W / 2, 330, 'glow').setScale(5).setTint(COLORS.grape).setAlpha(0.5);
    const prompt = this.add.text(GAME_W / 2, 500, step.prompt || '탭해서 카드 뒤집기', textStyle(20, CSS.cream, { fontStyle: 'bold' })).setOrigin(0.5);
    this.layer.add([glow, card, prompt]);
    this.tweens.add({ targets: prompt, alpha: { from: 1, to: 0.35 }, duration: 600, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: card, y: 322, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const onTap = () => {
      this.tweens.killTweensOf(card);
      prompt.destroy();
      Audio.sfx('flip');
      this.tweens.add({
        targets: card,
        scaleX: 0,
        duration: 160,
        onComplete: () => {
          card.setTexture('card_front');
          this.tweens.add({
            targets: card,
            scaleX: 1.25,
            duration: 160,
            onComplete: () => this.revealAll(step, card, glow),
          });
        },
      });
    };
    // 대사창을 닫은 탭이 같은 프레임에 전달되지 않도록 잠깐 뒤에 탭 대기 시작 (D30: 탭 전까지 대기)
    this.time.delayedCall(350, () => this.input.once('pointerdown', onTap));
  }

  revealAll(step, card, glow) {
    this.cameras.main.flash(600, 255, 255, 255);
    Audio.sfx('jackpot');
    glow.setTint(COLORS.lemon).setScale(8);
    this.tweens.add({ targets: glow, alpha: { from: 0.9, to: 0.4 }, duration: 800 });

    // 13장 전체 — 상징·실루엣 수준 (C3)
    const cards = [];
    for (let i = 0; i < 13; i++) {
      const row = i < 7 ? 0 : 1;
      const col = row === 0 ? i : i - 7;
      const count = row === 0 ? 7 : 6;
      const tx = GAME_W / 2 + (col - (count - 1) / 2) * 58;
      const ty = 215 + row * 120;
      const c = this.add.image(GAME_W / 2, 330, 'card_front').setScale(0.42).setAlpha(0);
      cards.push(c);
      this.layer.add(c);
      this.tweens.add({ targets: c, x: tx, y: ty, alpha: 1, angle: Phaser.Math.Between(-8, 8), duration: 500, delay: 120 + i * 45, ease: 'Back.easeOut' });
    }
    card.setDepth(1);
    this.tweens.add({ targets: card, alpha: 0, scale: 0.42, duration: 400, delay: 100 });
    const label = this.add.text(GAME_W / 2, 425, '13 / 13 — 전체 뽑기!', textStyle(26, CSS.lemon, { fontStyle: 'bold', stroke: CSS.ink, strokeThickness: 6 })).setOrigin(0.5).setAlpha(0);
    this.layer.add(label);
    this.tweens.add({ targets: label, alpha: 1, scale: { from: 0.6, to: 1 }, duration: 400, delay: 800, ease: 'Back.easeOut' });

    this.time.delayedCall(1700, () => {
      if (step.revealImage && cutsceneKey(this, step.revealImage)) this.setBackdrop(step.revealImage, step.fallback);
      this.say(step.after, () => this.nextStep());
    });
  }

  // ---------- 메신저풍 화면 (자체 제작 일반 UI — 특정 앱 모사 금지) ----------
  showMessenger(step) {
    const left = 28;
    const top = 110;
    const width = GAME_W - 56;
    const height = 590;
    const panel = this.add.graphics();
    panel.fillStyle(0x15122a, 0.96);
    panel.fillRoundedRect(left, top, width, height, 18);
    panel.fillStyle(COLORS.panel, 1);
    panel.fillRoundedRect(left, top, width, 52, { tl: 18, tr: 18, bl: 0, br: 0 });
    panel.lineStyle(2, COLORS.grape, 0.8);
    panel.strokeRoundedRect(left, top, width, height, 18);
    const title = this.add.text(GAME_W / 2, top + 26, step.title || '단톡', textStyle(17, CSS.cream, { fontStyle: 'bold' })).setOrigin(0.5);
    const online = this.add.text(left + width - 16, top + 26, '● 3', textStyle(12, CSS.mint)).setOrigin(1, 0.5);
    this.layer.add([panel, title, online]);

    let y = top + 72;
    const msgs = step.messages || [];
    msgs.forEach((m, i) => {
      this.time.delayedCall(500 + i * 650, () => {
        const h = this.addBubble(m, y, left, width);
        y += h + 10;
        Audio.sfx(m.from === 'me' ? 'blip' : 'click');
        if (m.glitch) {
          this.time.delayedCall(500, () => this.glitchLast());
        }
      });
    });
    const total = 500 + msgs.length * 650 + 1900;
    this.time.delayedCall(total, () => {
      this.glitchTimer?.remove(false);
      this.say(step.after, () => this.nextStep());
    });
  }

  addBubble(m, y, left, width) {
    const mine = m.from === 'me';
    const maxW = 250;
    const txt = this.add.text(0, 0, m.text, textStyle(16, mine ? CSS.ink : CSS.cream, { wordWrap: { width: maxW - 24 } }));
    const bw = Math.min(maxW, txt.width + 24);
    const bh = txt.height + 18;
    let nameH = 0;
    const items = [];
    if (!mine) {
      const name = this.add.text(left + 16, y, m.from, textStyle(12, CSS.grape));
      items.push(name);
      nameH = 18;
    }
    const bx = mine ? left + width - 16 - bw : left + 16;
    const by = y + nameH;
    const g = this.add.graphics();
    g.fillStyle(mine ? COLORS.rose : 0x3a3566, 1);
    g.fillRoundedRect(bx, by, bw, bh, 12);
    txt.setPosition(bx + 12, by + 9);
    items.push(g, txt);
    this.layer.add(items);
    if (m.glitch) this.glitchText = txt;
    return nameH + bh;
  }

  glitchLast() {
    const t = this.glitchText;
    if (!t) return;
    const base = t.text;
    const chars = ['▒', '█', '▓', '░'];
    Audio.sfx('glitch');
    this.cameras.main.shake(300, 0.006);
    this.glitchTimer = this.time.addEvent({
      delay: 70,
      loop: true,
      callback: () => {
        const out = base.replace(/[▒█▓░]/g, () => Phaser.Utils.Array.GetRandom(chars));
        t.setText(out);
        t.x += Phaser.Math.Between(-3, 3);
        t.setTint(Math.random() < 0.3 ? COLORS.danger : COLORS.white);
      },
    });
  }

  finish(skipped) {
    if (this.done) return;
    this.done = true;
    this.glitchTimer?.remove(false);
    Storage.updateProgress({ prologueSeen: true });
    this.scene.resume();
    this.cameras.main.fadeOut(skipped ? 200 : 500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game', { stageId: 'w1' }));
  }
}
