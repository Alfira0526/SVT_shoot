import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../config/constants.js';
import { Save } from '../systems/SaveSystem.js';

// 대사 오버레이 씬 (§3.8 / D12)
//  - 화면 하단 대사창 + 좌우 초상화, 탭으로 넘김
//  - 필수 UX: 스킵 버튼 + 빨리감기(타이핑 가속) — 재플레이 이탈 방지(기획자 요구)
//  data: { lines: [...], nickname, onComplete }
export class DialogueScene extends Phaser.Scene {
  constructor() {
    super('Dialogue');
  }

  init(data) {
    this.lines = data.lines || [];
    this.nickname = data.nickname || 'GUEST';
    this.onComplete = data.onComplete || (() => {});
    this.index = -1;
    this.typing = false;
    this.typeEvent = null;
  }

  create() {
    // 반투명 딤 (하단만 진하게)
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.35).setOrigin(0);

    const boxH = 190;
    const boxY = GAME_HEIGHT - boxH - 16;

    // 초상화 슬롯 (좌/우)
    this.portraitLeft = this.add.image(74, boxY - 20, '__none').setVisible(false).setDepth(2);
    this.portraitRight = this.add.image(GAME_WIDTH - 74, boxY - 20, '__none').setVisible(false).setDepth(2);

    // 대사창 패널
    this.panel = this.add.graphics().setDepth(1);
    this.panel.fillStyle(PALETTE.panel, 0.96);
    this.panel.lineStyle(2, PALETTE.serenity, 0.9);
    this.panel.fillRoundedRect(12, boxY, GAME_WIDTH - 24, boxH, 14);
    this.panel.strokeRoundedRect(12, boxY, GAME_WIDTH - 24, boxH, 14);

    this.speakerText = this.add
      .text(30, boxY + 14, '', { fontSize: '17px', color: PALETTE.goldHex, fontStyle: 'bold' })
      .setDepth(3);

    this.bodyText = this.add
      .text(30, boxY + 46, '', {
        fontSize: '18px',
        color: PALETTE.ink,
        wordWrap: { width: GAME_WIDTH - 60 },
        lineSpacing: 6,
      })
      .setDepth(3);

    // "탭하여 계속" 인디케이터
    this.hint = this.add
      .text(GAME_WIDTH - 30, boxY + boxH - 26, '▶', { fontSize: '16px', color: PALETTE.serenityHex })
      .setOrigin(1, 0.5)
      .setDepth(3);
    this.tweens.add({ targets: this.hint, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    // 스킵 버튼 (컷씬 전체 건너뛰기)
    this._makeButton(GAME_WIDTH - 58, 26, 'SKIP', () => this._finish());

    // 화면 탭 = 다음 / 타이핑 중이면 즉시 완성(빨리감기)
    this.input.on('pointerdown', (p) => {
      // 스킵 버튼 영역 제외
      if (p.y < 48 && p.x > GAME_WIDTH - 100) return;
      this._advance();
    });

    this._next();
  }

  _makeButton(x, y, label, cb) {
    const w = 84;
    const h = 34;
    const g = this.add.graphics().setDepth(4);
    g.fillStyle(0x000000, 0.5);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    g.lineStyle(1.5, PALETTE.rose, 0.9);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    this.add.text(x, y, label, { fontSize: '15px', color: PALETTE.roseHex, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(5);
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setDepth(6);
    zone.on('pointerdown', (p, lx, ly, ev) => {
      ev?.stopPropagation?.();
      cb();
    });
  }

  _advance() {
    if (this.typing) {
      this._completeLine();
    } else {
      this._next();
    }
  }

  _next() {
    this.index += 1;
    if (this.index >= this.lines.length) {
      this._finish();
      return;
    }
    const line = this.lines[this.index];
    const isNarration = !!line.narration || line.effect === 'narration' || !line.speaker;

    // 화면 흔들림 연출
    if (line.effect === 'shake' || line.shake) this.cameras.main.shake(260, 0.01);

    // 초상화 배치
    this.portraitLeft.setVisible(false);
    this.portraitRight.setVisible(false);
    if (!isNarration && line.portrait) {
      const texKey = this._portraitKey(line.portrait);
      const slot = line.side === 'right' ? this.portraitRight : this.portraitLeft;
      slot.setTexture(texKey).setVisible(true);
      slot.setTint(0xffffff);
      // 화자 강조: 반대쪽 어둡게
      const other = line.side === 'right' ? this.portraitLeft : this.portraitRight;
      other.setTint(0x555566);
    }

    const name = isNarration ? '' : this._resolve(line.speaker);
    this.speakerText.setText(name);
    this._typeLine(this._resolve(line.text), isNarration);
  }

  _typeLine(fullText, isNarration) {
    this.bodyText.setColor(isNarration ? PALETTE.inkDim : PALETTE.ink);
    this.bodyText.setFontStyle(isNarration ? 'italic' : 'normal');
    this._full = fullText;
    this.bodyText.setText('');
    this.typing = true;
    this.hint.setVisible(false);
    let i = 0;
    if (this.typeEvent) this.typeEvent.remove();
    this.typeEvent = this.time.addEvent({
      delay: 24,
      loop: true,
      callback: () => {
        i += 1;
        this.bodyText.setText(fullText.slice(0, i));
        if (i >= fullText.length) this._completeLine();
      },
    });
  }

  _completeLine() {
    if (this.typeEvent) this.typeEvent.remove();
    this.typeEvent = null;
    this.bodyText.setText(this._full);
    this.typing = false;
    this.hint.setVisible(true);
  }

  _finish() {
    if (this.typeEvent) this.typeEvent.remove();
    const cb = this.onComplete;
    this.scene.stop();
    cb();
  }

  _portraitKey(p) {
    const map = {
      bongi: 'pt_g_bongi', player: 'pt_player', noise: 'pt_noise', server: 'pt_server',
      monopolist: 'pt_monopolist', // Final 흑막(D37)
      // W3 암표 총책 감정곡선 (D34): 등장=sell / 균열=smug / 격파=crack
      scalper: 'pt_scalper_sell', scalper_sell: 'pt_scalper_sell',
      scalper_smug: 'pt_scalper_smug', scalper_crack: 'pt_scalper_crack',
    };
    if (map[p]) return map[p];
    // 수호자 등 데이터 주도 초상화: 텍스처 키를 직접 지정한 경우 그대로 사용 (예: pt_bongi_gold)
    if (p && this.textures.exists(p)) return p;
    return 'pt_player';
  }

  _resolve(s) {
    // 인수인계 §5: {nickname} 플레이스홀더. 기획서 §2.9 원문의 [닉네임] 표기도 함께 지원.
    return String(s || '')
      .replace(/\{nickname\}/g, this.nickname)
      .replace(/\[닉네임\]/g, this.nickname);
  }
}
