import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../config/constants.js';
import prologueData from '../config/dialogue_prologue.json';
import { safeDisplayName } from '../systems/Filter.js';
import { Save } from '../systems/SaveSystem.js';
import { renderCut } from '../systems/Cutscene.js';
import { Audio } from '../systems/Audio.js';

// 프롤로그 v2 (D30) — 유저 시점 콜드오픈. 컷씬 이미지 시스템(D31) 위에서 동작.
// 비트 타입: caption / voice / tap_card / reveal / messenger / glitch / accident
// 봉이 정체는 유예("???"), 창세 설명(온빛·요정)은 W1 이후 분산.
export class PrologueScene extends Phaser.Scene {
  constructor() {
    super('Prologue');
  }

  create() {
    this.beats = prologueData.beats || [];
    this.nickname = safeDisplayName(this.registry.get('nickname'));
    this.i = -1;
    this._done = false;
    this._beatTap = null;
    this._curCutId = null;
    this._cutLayer = null;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.deep).setOrigin(0).setDepth(-1);
    this._beatLayer = this.add.container(0, 0).setDepth(5);
    this._buildCaptionPanel();
    this._buildSkip();

    this.input.on('pointerdown', (p) => {
      if (this._done) return;
      if (p.y < 52 && p.x > GAME_WIDTH - 104) return; // SKIP 버튼 영역
      if (this._beatTap) this._beatTap();
    });

    this.cameras.main.fadeIn(400, 0, 0, 0);
    this._next();
  }

  // ── 진행 ────────────────────────────────────────────────
  _next() {
    this.i += 1;
    if (this.i >= this.beats.length) return this._finishAll();
    const b = this.beats[this.i];
    this._setCut(b.cut, b.image);
    this._beatLayer.removeAll(true);
    this._beatTap = null;
    this._hideCaption();
    if (b.effect === 'shake') this.cameras.main.shake(320, 0.013);

    switch (b.type) {
      case 'tap_card': this._doTapCard(b); break;
      case 'reveal': this._doReveal(b); break;
      case 'messenger': this._doMessenger(b); break;
      case 'glitch': this._doGlitch(b); break;
      default: this._doCaption(b); // caption / voice / accident
    }
  }

  _finishAll() {
    if (this._done) return;
    this._done = true;
    Save.setFlag('prologueSeen'); // 시청 여부 기록용(현재 스킵 미연동 — 프롤로그는 매번 재생)
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Multiverse'));
  }

  _setCut(cutId, imageKey) {
    if (!cutId || cutId === this._curCutId) return; // 같은 컷 유지
    this._curCutId = cutId;
    const layer = renderCut(this, cutId, imageKey).setDepth(0).setAlpha(0);
    this.tweens.add({ targets: layer, alpha: 1, duration: 350 });
    const old = this._cutLayer;
    this._cutLayer = layer;
    if (old) this.tweens.add({ targets: old, alpha: 0, duration: 350, onComplete: () => old.destroy() });
  }

  // ── 비트: 캡션/보이스/사고 ───────────────────────────────
  _doCaption(b) {
    this._showCaption(this._resolve(b.text), b.speaker ? this._resolve(b.speaker) : '');
    this._beatTap = () => (this._capTyping ? this._completeCaption() : this._next());
  }

  // ── 비트: 탭 카드 뒤집기 (참여형 인터랙션) ─────────────────
  _doTapCard(b) {
    this._showCaption(this._resolve(b.text), '');
    const cx = GAME_WIDTH / 2, cy = 320;
    const card = this.add.container(cx, cy);
    let back;
    if (this.textures.exists('card_back')) {
      back = this.add.image(0, 0, 'card_back').setDisplaySize(150, 234); // 도트 카드 뒷면(오리지널)
    } else {
      // 폴백: 절차 결정 무늬 카드
      back = this.add.graphics();
      back.fillStyle(0x2a2450, 1); back.fillRoundedRect(-70, -100, 140, 200, 16);
      back.lineStyle(3, PALETTE.serenity, 0.9); back.strokeRoundedRect(-70, -100, 140, 200, 16);
      back.fillStyle(PALETTE.serenity, 0.9); back.fillTriangle(0, -34, -26, -6, 26, -6);
      back.fillStyle(PALETTE.rose, 0.95); back.fillTriangle(-26, -6, 26, -6, 0, 34);
    }
    card.add(back);
    this._beatLayer.add(card);
    this.tweens.add({ targets: card, y: cy - 10, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    let flipped = false;
    this._beatTap = () => {
      if (flipped) return;
      flipped = true;
      this.tweens.killTweensOf(card);
      Audio.sfx('ui');
      this.tweens.add({
        targets: card, scaleX: 0, duration: 160, ease: 'Quad.easeIn',
        onComplete: () => {
          back.setVisible(false);
          const front = this.add.graphics();
          front.fillStyle(PALETTE.light, 1);
          front.fillRoundedRect(-75, -117, 150, 234, 16);
          front.fillStyle(0xffffff, 0.9);
          front.fillCircle(0, 0, 34);
          card.add(front);
          this.tweens.add({
            targets: card, scaleX: 1, duration: 160, ease: 'Quad.easeOut',
            onComplete: () => this.time.delayedCall(350, () => this._next()),
          });
        },
      });
    };
  }

  // ── 비트: 13장 전체 공개 ─────────────────────────────────
  _doReveal(b) {
    Audio.sfx('powerup');
    const burst = this.add.image(GAME_WIDTH / 2, 300, 'spark').setTint(PALETTE.light)
      .setBlendMode(Phaser.BlendModes.ADD).setScale(2);
    this._beatLayer.add(burst);
    this.tweens.add({ targets: burst, scale: 60, alpha: 0, duration: 700, ease: 'Cubic.easeOut' });
    for (let i = 0; i < 13; i++) {
      const ang = Phaser.Math.DegToRad(-90 + (i - 6) * 12);
      const card = this.add.container(GAME_WIDTH / 2, 320);
      const g = this.add.graphics();
      g.fillStyle(0xece7d0, 1); g.fillRoundedRect(-16, -24, 32, 48, 6);
      g.lineStyle(1.5, i % 2 ? PALETTE.rose : PALETTE.serenity, 1); g.strokeRoundedRect(-16, -24, 32, 48, 6);
      g.fillStyle(PALETTE.light, 0.9); g.fillCircle(0, -4, 6);
      card.add(g);
      card.setScale(0.4);
      this._beatLayer.add(card);
      const tx = GAME_WIDTH / 2 + Math.cos(ang) * 120;
      const ty = 300 + Math.sin(ang) * 70;
      this.tweens.add({
        targets: card, x: tx, y: ty, scale: 1, angle: Phaser.Math.RadToDeg(ang) + 90,
        duration: 500, delay: i * 30, ease: 'Back.easeOut',
      });
    }
    this._showCaption(this._resolve(b.text), '');
    this._beatTap = () => (this._capTyping ? this._completeCaption() : this._next());
  }

  // ── 비트: 메신저 자랑 + 수신 글리치 (노이즈 첫 복선) ────────
  _doMessenger(b) {
    const chat = b.chat || [];
    const px = 24, pw = GAME_WIDTH - 48, py = 78, ph = 610;
    const panel = this.add.graphics();
    panel.fillStyle(0x0e0c1c, 0.9); panel.fillRoundedRect(px, py, pw, ph, 16);
    panel.lineStyle(2, PALETTE.serenity, 0.35); panel.strokeRoundedRect(px, py, pw, ph, 16);
    panel.fillStyle(0x1c1838, 1); panel.fillRoundedRect(px, py, pw, 40, 16);
    const hdr = this.add.text(GAME_WIDTH / 2, py + 20, '덕질 메이트 💬', { fontSize: '15px', color: PALETTE.ink, fontStyle: 'bold' }).setOrigin(0.5);
    this._beatLayer.add([panel, hdr]);

    this._msgY = py + 58;
    let idx = -1;
    const step = () => {
      idx += 1;
      if (idx >= chat.length) {
        this._hint.setVisible(true);
        this._beatTap = () => this._next();
        return;
      }
      this._addBubble(chat[idx], px, pw);
      this._beatTap = step;
    };
    step();
  }

  _addBubble(m, px, pw) {
    const mine = m.from === 'me';
    const maxW = pw - 80;
    const label = mine ? '' : (m.name || '친구');
    const text = this._resolve(m.text);
    const tmp = this.add.text(0, 0, text, { fontSize: '15px', wordWrap: { width: maxW - 24 } }).setVisible(false);
    const tw = Math.min(maxW, tmp.width + 24);
    const th = tmp.height + 20;
    tmp.destroy();

    const bx = mine ? px + pw - tw - 14 : px + 14;
    const by = this._msgY + (label ? 16 : 0);
    const cont = this.add.container(0, 0);
    if (label) {
      cont.add(this.add.text(bx + 4, this._msgY - 2, label, { fontSize: '11px', color: PALETTE.serenityHex }));
    }
    const g = this.add.graphics();
    g.fillStyle(mine ? PALETTE.rose : 0x2a2650, 1);
    g.fillRoundedRect(bx, by, tw, th, 12);
    const body = this.add.text(bx + 12, by + 10, text, {
      fontSize: '15px', color: mine ? '#2a1a2a' : PALETTE.ink, wordWrap: { width: maxW - 24 },
    });
    cont.add([g, body]);
    this._beatLayer.add(cont);
    this._msgY = by + th + 12;

    cont.setAlpha(0);
    this.tweens.add({ targets: cont, alpha: 1, duration: 200 });
    Audio.sfx('ui');

    if (m.glitch) {
      this.time.delayedCall(260, () => this._glitchText(body, text, PALETTE.dangerHex));
    }
  }

  // ── 비트: 글리치 (풀스크린 노이즈 복선) ────────────────────
  _doGlitch(b) {
    this.cameras.main.flash(120, 255, 80, 100, false);
    const tint = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x2a0812, 0.5).setOrigin(0);
    const g = this.add.graphics();
    for (let i = 0; i < 10; i++) {
      g.fillStyle(PALETTE.danger, Phaser.Math.FloatBetween(0.15, 0.5));
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      g.fillRect(0, y, GAME_WIDTH, Phaser.Math.Between(2, 6));
    }
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontSize: '22px', color: PALETTE.dangerHex, fontStyle: 'bold', align: 'center',
      stroke: '#000', strokeThickness: 4, wordWrap: { width: GAME_WIDTH - 60 },
    }).setOrigin(0.5);
    this._beatLayer.add([tint, g, t]);
    this._glitchText(t, this._resolve(b.text), PALETTE.dangerHex);
    Audio.sfx('playerHit');
    this._beatTap = () => this._next();
    this.time.delayedCall(1700, () => { if (!this._done && this.beats[this.i]?.type === 'glitch') this._next(); });
  }

  // 글리치 타이핑: 스크램블 → 원문 정착 + 좌우 지터
  // (비트 전환 시 대상 텍스트가 파괴될 수 있으므로 매 콜백에서 생존 확인)
  _glitchText(textObj, finalText, color) {
    if (!textObj || !textObj.active) return;
    const pool = '▓▒░#@%&*01지직ㅊㅋ';
    const baseX = textObj.x;
    let t = 0;
    const total = 14;
    this.time.addEvent({
      delay: 45, repeat: total, callback: () => {
        if (!textObj.active || !textObj.scene) return; // 파괴됨 → 무시
        t += 1;
        if (t >= total) { textObj.setText(finalText).setX(baseX).setColor(color); return; }
        const s = finalText.split('').map((ch) => (ch === ' ' ? ' ' : pool[Phaser.Math.Between(0, pool.length - 1)])).join('');
        textObj.setText(s).setX(baseX + (t % 2 ? 2 : -2));
      },
    });
  }

  // ── 캡션(하단 대사창) ────────────────────────────────────
  _buildCaptionPanel() {
    const boxH = 150, boxY = GAME_HEIGHT - boxH - 16;
    this._capPanel = this.add.graphics().setDepth(8).setVisible(false);
    this._capPanel.fillStyle(PALETTE.panel, 0.94);
    this._capPanel.lineStyle(2, PALETTE.serenity, 0.85);
    this._capPanel.fillRoundedRect(12, boxY, GAME_WIDTH - 24, boxH, 14);
    this._capPanel.strokeRoundedRect(12, boxY, GAME_WIDTH - 24, boxH, 14);
    this._capSpeaker = this.add.text(30, boxY + 12, '', { fontSize: '16px', color: PALETTE.goldHex, fontStyle: 'bold' }).setDepth(9).setVisible(false);
    this._capBody = this.add.text(30, boxY + 42, '', {
      fontSize: '18px', color: PALETTE.ink, wordWrap: { width: GAME_WIDTH - 60 }, lineSpacing: 6,
    }).setDepth(9).setVisible(false);
    this._hint = this.add.text(GAME_WIDTH - 30, boxY + boxH - 24, '▶', { fontSize: '16px', color: PALETTE.serenityHex })
      .setOrigin(1, 0.5).setDepth(9).setVisible(false);
    this.tweens.add({ targets: this._hint, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
  }

  _showCaption(text, speaker) {
    this._capPanel.setVisible(true);
    this._capSpeaker.setVisible(!!speaker).setText(speaker || '');
    this._capBody.setVisible(true);
    this._hint.setVisible(false);
    this._capBody.setColor(speaker ? PALETTE.ink : PALETTE.inkDim);
    this._capBody.setFontStyle(speaker ? 'normal' : 'italic');
    this._capFull = text;
    this._capBody.setText('');
    this._capTyping = true;
    if (this._capEvent) this._capEvent.remove();
    let i = 0;
    this._capEvent = this.time.addEvent({
      delay: 26, loop: true, callback: () => {
        i += 1;
        this._capBody.setText(text.slice(0, i));
        if (i >= text.length) this._completeCaption();
      },
    });
  }

  _completeCaption() {
    if (this._capEvent) this._capEvent.remove();
    this._capEvent = null;
    this._capBody.setText(this._capFull);
    this._capTyping = false;
    this._hint.setVisible(true);
  }

  _hideCaption() {
    if (this._capEvent) this._capEvent.remove();
    this._capEvent = null;
    this._capTyping = false;
    this._capPanel?.setVisible(false);
    this._capSpeaker?.setVisible(false);
    this._capBody?.setVisible(false);
    this._hint?.setVisible(false);
  }

  // ── 스킵 (§3.8 필수) ─────────────────────────────────────
  _buildSkip() {
    const x = GAME_WIDTH - 56, y = 28, w = 84, h = 34;
    const g = this.add.graphics().setDepth(20);
    g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    g.lineStyle(1.5, PALETTE.rose, 0.9); g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    this.add.text(x, y, 'SKIP', { fontSize: '15px', color: PALETTE.roseHex, fontStyle: 'bold' }).setOrigin(0.5).setDepth(21);
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setDepth(22);
    zone.on('pointerdown', (p, lx, ly, ev) => { ev?.stopPropagation?.(); this._finishAll(); });
  }

  _resolve(s) {
    return String(s || '').replace(/\{nickname\}/g, this.nickname).replace(/\[닉네임\]/g, this.nickname);
  }
}
