import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../config/constants.js';
import { submitScore, fetchRanking } from '../net/supabase.js';

// 랭킹 (§3.1-3, §6) — 점수 제출 → 보드 표시 → 재도전.
export class RankingScene extends Phaser.Scene {
  constructor() {
    super('Ranking');
  }

  init(data) {
    this.result = data;
  }

  async create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.deep).setOrigin(0);

    const { score, gameover, nickname, maxAllowed, noMiss, playMs } = this.result;
    const submitName = this.result.rawNickname || nickname;

    this.add
      .text(GAME_WIDTH / 2, 60, gameover ? 'GAME OVER' : 'STAGE CLEAR', {
        fontSize: '30px',
        fontStyle: 'bold',
        color: gameover ? PALETTE.dangerHex : PALETTE.goldHex,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 108, '내 점수', { fontSize: '14px', color: PALETTE.serenityHex })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 140, score.toLocaleString('en-US'), {
        fontSize: '40px',
        fontStyle: 'bold',
        color: PALETTE.ink,
      })
      .setOrigin(0.5);
    if (noMiss) {
      this.add
        .text(GAME_WIDTH / 2, 176, '★ NO MISS +5,000', { fontSize: '13px', color: PALETTE.roseHex })
        .setOrigin(0.5);
    }

    const status = this.add
      .text(GAME_WIDTH / 2, 208, '랭킹 제출 중…', { fontSize: '13px', color: PALETTE.inkDim })
      .setOrigin(0.5);

    // 제출 → 보드
    let myRank = null;
    try {
      const res = await submitScore({ nickname: submitName, score, mode: 'stage', maxAllowed, playMs });
      myRank = res.ok ? res.rank : null;
      status.setText(res.ok ? (myRank ? `내 순위 ${myRank}위` : '제출 완료') : this._rejectMsg(res.reason));
    } catch {
      status.setText('오프라인 — 로컬 저장');
    }

    await this._renderBoard(submitName, score);

    // 로컬 저장 고지 (§5.5 — 기기 종속)
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 118, '※ 진행도·랭킹은 이 기기에 저장됩니다 (v1)', {
        fontSize: '11px',
        color: PALETTE.inkDim,
      })
      .setOrigin(0.5);

    this._button(GAME_WIDTH / 2 - 92, GAME_HEIGHT - 66, '다시 도전', () =>
      this.scene.start('Game', { stageId: 'w1' })
    );
    this._button(GAME_WIDTH / 2 + 92, GAME_HEIGHT - 66, '타이틀', () => this.scene.start('Title'));
  }

  async _renderBoard(myNick, myScore) {
    const rows = await fetchRanking({ mode: 'stage', limit: 8 });
    const startY = 250;
    this.add
      .text(GAME_WIDTH / 2, startY - 26, '— 명예의 전당 —', { fontSize: '15px', color: PALETTE.goldHex })
      .setOrigin(0.5);

    if (rows.length === 0) {
      this.add
        .text(GAME_WIDTH / 2, startY + 20, '첫 기록의 주인공이 되어보세요!', {
          fontSize: '13px',
          color: PALETTE.inkDim,
        })
        .setOrigin(0.5);
      return;
    }

    let highlighted = false;
    rows.forEach((r, i) => {
      const y = startY + i * 30;
      const isMe = !highlighted && r.nickname === myNick && r.score === myScore;
      if (isMe) highlighted = true;
      const color = isMe ? PALETTE.roseHex : PALETTE.ink;
      const rankStr = ['🥇', '🥈', '🥉'][i] || `${i + 1}`;
      this.add.text(46, y, rankStr, { fontSize: '15px', color }).setOrigin(0, 0.5);
      this.add.text(84, y, r.nickname, { fontSize: '15px', color, fontStyle: isMe ? 'bold' : 'normal' }).setOrigin(0, 0.5);
      this.add
        .text(GAME_WIDTH - 46, y, r.score.toLocaleString('en-US'), { fontSize: '15px', color })
        .setOrigin(1, 0.5);
    });
  }

  _rejectMsg(reason) {
    return (
      {
        'score-out-of-range': '제출 반려(점수 상한 초과)',
        'rate-too-high': '제출 반려(비정상 점수 속도)',
        'nickname-rejected': '제출 반려(닉네임 규칙 위반)',
      }[reason] || '제출 반려'
    );
  }

  _button(x, y, label, cb) {
    const w = 160;
    const h = 48;
    const g = this.add.graphics();
    g.fillStyle(PALETTE.serenity, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    this.add.text(x, y, label, { fontSize: '18px', color: '#12233a', fontStyle: 'bold' }).setOrigin(0.5);
    const z = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    z.on('pointerover', () => g.setAlpha(0.85));
    z.on('pointerout', () => g.setAlpha(1));
    z.on('pointerdown', cb);
  }
}
