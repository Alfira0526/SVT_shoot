import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../config/constants.js';
import { Save } from '../systems/SaveSystem.js';
import { Audio } from '../systems/Audio.js';
import worldsCfg from '../config/worlds.json';
import guardians from '../config/guardians.json';

const NAME = {};
guardians.roster.forEach((g) => { NAME[g.id] = g.name; });

// 다중세계 지도 v2 — 팬덤 경험 의인화 13세계(정령 1/세계) + 완결의 문(무결).
//  개별 코인 해금(비연쇄): firstWorld는 항상 열림, 나머지는 해금 코인으로 하나씩 구매식 개방.
//  코인은 세계 클리어로 획득. finale(무결)은 13세계를 모두 클리어하면 개방.
export class MultiverseScene extends Phaser.Scene {
  constructor() {
    super('Multiverse');
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.deep).setOrigin(0);
    for (let i = 0; i < 50; i++) {
      this.add.image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT), 'star')
        .setScale(Phaser.Math.Between(1, 2)).setAlpha(Phaser.Math.FloatBetween(0.15, 0.6))
        .setTint(i % 2 ? PALETTE.rose : PALETTE.serenity);
    }

    this.add.text(GAME_WIDTH / 2, 30, '다중세계', { fontSize: '28px', fontStyle: 'bold', color: PALETTE.ink }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 58, '응원봉이 여는 문 — 잠든 빛을 데리러 가자', { fontSize: '12px', color: PALETTE.serenityHex }).setOrigin(0.5);

    const cleared = new Set(Save.getWorldsCleared());
    const coins = Save.getUnlockCoins();
    const worlds = worldsCfg.worlds;
    const storyWorlds = worlds.filter((w) => w.entry !== 'finale');
    const clearedStory = storyWorlds.filter((w) => cleared.has(w.id)).length;

    // 코인 잔액 표시줄
    const cg = this.add.graphics();
    cg.fillStyle(PALETTE.panel, 0.9); cg.fillRoundedRect(GAME_WIDTH / 2 - 96, 74, 192, 24, 12);
    cg.lineStyle(1.5, PALETTE.gold, 0.8); cg.strokeRoundedRect(GAME_WIDTH / 2 - 96, 74, 192, 24, 12);
    this.add.text(GAME_WIDTH / 2, 86, `🪙 해금 코인 ${coins}   ·   빛 ${clearedStory}/${storyWorlds.length}`, {
      fontSize: '12px', color: PALETTE.goldHex, fontStyle: 'bold',
    }).setOrigin(0.5);

    // 2열 × 7행 그리드 (13세계 + 무결)
    const cols = 2, mx = 18, gapX = 12, gapY = 9;
    const cellW = (GAME_WIDTH - mx * 2 - gapX) / cols;
    const cellH = 70, startY = 106, pitch = cellH + gapY;
    worlds.forEach((w, i) => {
      const cx = mx + (i % cols) * (cellW + gapX);
      const cy = startY + Math.floor(i / cols) * pitch;
      this._cell(w, cx, cy, cellW, cellH, {
        cleared: cleared.has(w.id), coins, clearedStory, storyTotal: storyWorlds.length,
      });
    });

    this._back();
  }

  // 세계 상태 판정 — open(플레이 가능) / affordable(해금 가능) / cost / reason
  _stateOf(w, ctx) {
    if (w.entry === 'finale') {
      const open = ctx.clearedStory >= ctx.storyTotal;
      return { open, finale: true, needMore: ctx.storyTotal - ctx.clearedStory };
    }
    const unlocked = w.unlockCost === 0 || w.id === worldsCfg.firstWorld || Save.isWorldUnlocked(w.id);
    if (unlocked) return { open: true };
    return { open: false, cost: w.unlockCost, affordable: ctx.coins >= w.unlockCost };
  }

  _cell(w, x, y, ww, hh, ctx) {
    const st = this._stateOf(w, ctx);
    const accent = PALETTE[w.color] || PALETTE.serenity;
    const accentHex = { danger: PALETTE.dangerHex, serenity: PALETTE.serenityHex, mint: '#8fdcc2', lavender: '#c9b8e8', rose: PALETTE.roseHex, gold: PALETTE.goldHex }[w.color] || PALETTE.serenityHex;
    const g = this.add.graphics();
    g.fillStyle(st.open ? (ctx.cleared ? 0x161a2e : PALETTE.panel) : 0x100e1c, 1);
    g.fillRoundedRect(x, y, ww, hh, 10);
    g.lineStyle(2, st.open ? accent : (st.affordable ? PALETTE.gold : 0x2a2540), st.open ? 0.95 : (st.affordable ? 0.9 : 0.6));
    g.strokeRoundedRect(x, y, ww, hh, 10);
    // 좌측 세계 색 스와치
    g.fillStyle(accent, st.open ? 0.9 : 0.28);
    g.fillRoundedRect(x + 7, y + 10, 6, hh - 20, 3);

    const nameCol = st.open ? PALETTE.ink : '#6a6390';
    const lock = st.open ? '' : '🔒 ';
    this.add.text(x + 22, y + 9, lock + w.name, { fontSize: '15px', color: nameCol, fontStyle: 'bold', wordWrap: { width: ww - 34 } }).setOrigin(0, 0);
    this.add.text(x + 22, y + 32, w.sub, { fontSize: '10px', color: st.open ? PALETTE.inkDim : '#4d4770' }).setOrigin(0, 0);

    // 하단 상태줄
    let status = '', scol = accentHex;
    if (st.finale) {
      status = st.open ? '✦ 최종 · 진입 ▶' : `🔒 빛 ${ctx.storyTotal - st.needMore}/${ctx.storyTotal}`;
      scol = st.open ? PALETTE.goldHex : '#6a6390';
    } else if (ctx.cleared) {
      status = '✓ 클리어'; scol = PALETTE.okHex || '#4be08a';
    } else if (st.open) {
      status = '진입 ▶';
    } else {
      status = `${st.affordable ? '🔓' : '🔒'} ${st.cost}코인`;
      scol = st.affordable ? PALETTE.goldHex : '#6a6390';
    }
    this.add.text(x + ww - 12, y + hh - 12, status, { fontSize: '12px', color: scol, fontStyle: 'bold' }).setOrigin(1, 1);

    // 상호작용
    const zone = this.add.zone(x + ww / 2, y + hh / 2, ww, hh).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      Audio.unlock();
      if (st.open) {
        Audio.sfx('ui');
        this.scene.start('Game', { worldId: w.id });
      } else if (st.finale) {
        Audio.sfx('playerHit');
        this._toast(`아직 잠들어 있어. 빛 ${st.needMore}개를 더 데려오면 열려.`);
      } else if (st.affordable) {
        if (Save.unlockWorld(w.id, st.cost)) {
          Audio.sfx('powerup');
          this.scene.restart();
        }
      } else {
        Audio.sfx('playerHit');
        this._toast(`해금 코인이 부족해. 세계를 클리어하면 코인을 얻어.`);
      }
    });
  }

  _toast(msg) {
    if (this._toastObj) this._toastObj.destroy();
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 96, msg, {
      fontSize: '13px', color: PALETTE.ink, fontStyle: 'bold', align: 'center',
      backgroundColor: 'rgba(22,19,39,0.95)', padding: { x: 12, y: 8 }, wordWrap: { width: GAME_WIDTH - 60 },
    }).setOrigin(0.5).setDepth(60);
    this._toastObj = t;
    this.tweens.add({ targets: t, alpha: 0, y: GAME_HEIGHT - 120, duration: 1800, delay: 900, onComplete: () => t.destroy() });
  }

  _back() {
    const y = GAME_HEIGHT - 34, w = 180, h = 40;
    const g = this.add.graphics();
    g.fillStyle(PALETTE.panel, 1); g.fillRoundedRect(GAME_WIDTH / 2 - w / 2, y - h / 2, w, h, 12);
    g.lineStyle(2, PALETTE.serenity, 0.9); g.strokeRoundedRect(GAME_WIDTH / 2 - w / 2, y - h / 2, w, h, 12);
    this.add.text(GAME_WIDTH / 2, y, '타이틀로', { fontSize: '16px', color: PALETTE.ink, fontStyle: 'bold' }).setOrigin(0.5);
    this.add.zone(GAME_WIDTH / 2, y, w, h).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { Audio.sfx('ui'); this.scene.start('Title'); });
  }
}
