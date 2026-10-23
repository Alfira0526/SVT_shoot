import Phaser from 'phaser';
import { COLORS, CSS, DEPTH, GAME_H, GAME_W, RANK_LIMITS } from '../config/constants.js';
import { Audio } from '../systems/Audio.js';
import { Storage } from '../systems/Storage.js';
import { makeButton, textStyle } from '../systems/ui.js';
import { drawVerticalGradient } from '../systems/Textures.js';
import { fetchTop, isOnline } from '../net/supabase.js';

// D3 — v1부터 온라인 랭킹. 비동기 경쟁(실시간 멀티 없음).
export default class RankingScene extends Phaser.Scene {
  constructor() {
    super('Ranking');
  }

  create() {
    const g = this.add.graphics().setDepth(DEPTH.backdrop);
    drawVerticalGradient(g, 0, 0, GAME_W, GAME_H, COLORS.deep, 0x33285f);
    this.add.tileSprite(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 'stars').setDepth(DEPTH.stars);

    this.add.text(GAME_W / 2, 60, '수호자 랭킹', textStyle(32, CSS.cream, { fontStyle: 'bold', stroke: CSS.ink, strokeThickness: 6 })).setOrigin(0.5);
    this.sub = this.add.text(GAME_W / 2, 100, isOnline() ? '온라인 · 본편(stage) 모드' : '오프라인 · 이 기기 기록', textStyle(13, CSS.serenity)).setOrigin(0.5);

    const me = Storage.getNickname();
    const best = Storage.getProgress().bestScore || 0;
    this.add.text(GAME_W / 2, 128, me ? `${me} · 내 최고 ${best.toLocaleString()}` : '', textStyle(13, CSS.gray)).setOrigin(0.5);

    this.listLayer = this.add.container(0, 0);
    this.loading = this.add.text(GAME_W / 2, 360, '불러오는 중…', textStyle(18, CSS.cream)).setOrigin(0.5);

    makeButton(this, GAME_W / 2, GAME_H - 60, '뒤로', () => this.scene.start('Title'), { w: 240, color: COLORS.rose });

    this.cameras.main.fadeIn(300, 0, 0, 0);
    Audio.playBgm('title');
    this.loadBoard();
  }

  async loadBoard() {
    const res = await fetchTop(RANK_LIMITS.boardSize);
    if (!this.scene.isActive()) return;
    this.loading.destroy();
    if (res.reason) this.sub.setText(res.reason).setColor(CSS.danger);
    const rows = res.rows || [];
    if (!rows.length) {
      this.add.text(GAME_W / 2, 360, '아직 기록이 없어요.\n첫 수호자가 되어 보세요!', textStyle(18, CSS.cream, { align: 'center' })).setOrigin(0.5);
      return;
    }
    const me = Storage.getNickname();
    const top = 160;
    const rowH = 28;
    rows.slice(0, RANK_LIMITS.boardSize).forEach((r, i) => {
      const y = top + i * rowH;
      const mine = me && r.nickname === me;
      const color = i === 0 ? CSS.lemon : i === 1 ? CSS.serenity : i === 2 ? CSS.coral : mine ? CSS.rose : CSS.cream;
      if (mine) {
        const hl = this.add.rectangle(GAME_W / 2, y + 12, 400, rowH - 2, COLORS.rose, 0.12);
        this.listLayer.add(hl);
      }
      this.listLayer.add(this.add.text(48, y, `${i + 1}`.padStart(2, ' '), textStyle(17, color, { fontStyle: 'bold' })));
      this.listLayer.add(this.add.text(96, y, r.nickname, textStyle(17, color)));
      this.listLayer.add(this.add.text(GAME_W - 48, y, Number(r.score).toLocaleString(), textStyle(17, color)).setOrigin(1, 0));
    });
  }
}
