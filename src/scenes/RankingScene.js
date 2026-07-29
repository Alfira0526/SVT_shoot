import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../config/constants.js';
import { submitScore, fetchRanking, isRemoteRanking } from '../net/supabase.js';
import { Audio } from '../systems/Audio.js';

// 랭킹 (§3.1-3, §6, §11)
//  - 결과 모드: 점수 제출 → 보드 → 다시 도전/타이틀
//  - 조회 모드(viewOnly): 타이틀 "랭킹 보기" — 제출 없이 보드만
export class RankingScene extends Phaser.Scene {
  constructor() {
    super('Ranking');
  }

  init(data) {
    this.result = data || {};
    this.viewOnly = !!this.result.viewOnly;
  }

  async create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.deep).setOrigin(0);
    if (this.viewOnly) await this._createViewOnly();
    else await this._createResult();
  }

  async _createResult() {
    const { score, gameover, nickname, maxAllowed, noMiss, playMs } = this.result;
    const submitName = this.result.rawNickname || nickname;
    Audio.sfx(gameover ? 'gameover' : 'clear');

    this.add
      .text(GAME_WIDTH / 2, 56, gameover ? 'GAME OVER' : 'STAGE CLEAR', {
        fontSize: '30px',
        fontStyle: 'bold',
        color: gameover ? PALETTE.dangerHex : PALETTE.goldHex,
      })
      .setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 100, '내 점수', { fontSize: '14px', color: PALETTE.serenityHex }).setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 132, score.toLocaleString('en-US'), { fontSize: '40px', fontStyle: 'bold', color: PALETTE.ink })
      .setOrigin(0.5);
    if (noMiss) {
      this.add.text(GAME_WIDTH / 2, 168, '★ NO MISS +5,000', { fontSize: '13px', color: PALETTE.roseHex }).setOrigin(0.5);
    }

    const status = this.add
      .text(GAME_WIDTH / 2, 198, '랭킹 제출 중…', { fontSize: '13px', color: PALETTE.inkDim })
      .setOrigin(0.5);

    let myRank = null;
    try {
      const res = await submitScore({ nickname: submitName, score, mode: 'stage', maxAllowed, playMs });
      myRank = res.ok ? res.rank : null;
      status.setText(res.ok ? (myRank ? `내 순위 ${myRank}위` : '제출 완료') : this._rejectMsg(res.reason));
    } catch {
      status.setText('오프라인 — 로컬 저장');
    }

    await this._renderBoard(238, submitName, score, 7);
    this._notice();

    this._button(GAME_WIDTH / 2 - 92, GAME_HEIGHT - 66, '다시 도전', () => {
      Audio.sfx('ui');
      this.scene.start('Game', { stageId: 'w1' });
    });
    this._button(GAME_WIDTH / 2 + 92, GAME_HEIGHT - 66, '타이틀', () => {
      Audio.sfx('ui');
      this.scene.start('Title');
    });
  }

  async _createViewOnly() {
    this.add.text(GAME_WIDTH / 2, 70, '명예의 전당', { fontSize: '30px', fontStyle: 'bold', color: PALETTE.goldHex }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 108, 'STAGE 랭킹', { fontSize: '13px', color: PALETTE.serenityHex }).setOrigin(0.5);

    await this._renderBoard(160, null, null, 12);
    this._notice();

    this._button(GAME_WIDTH / 2, GAME_HEIGHT - 66, '타이틀로', () => {
      Audio.sfx('ui');
      this.scene.start('Title');
    });
  }

  _notice() {
    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 112,
        isRemoteRanking() ? '※ 랭킹은 온라인 서버에 기록됩니다' : '※ 진행도·랭킹은 이 기기에 저장됩니다 (v1)',
        { fontSize: '11px', color: PALETTE.inkDim }
      )
      .setOrigin(0.5);
  }

  async _renderBoard(startY, myNick, myScore, limit) {
    this.add.text(GAME_WIDTH / 2, startY - 24, '— TOP ' + limit + ' —', { fontSize: '13px', color: PALETTE.goldHex }).setOrigin(0.5);
    const rows = await fetchRanking({ mode: 'stage', limit });

    if (rows.length === 0) {
      this.add
        .text(GAME_WIDTH / 2, startY + 24, '첫 기록의 주인공이 되어보세요!', { fontSize: '13px', color: PALETTE.inkDim })
        .setOrigin(0.5);
      return;
    }

    let highlighted = false;
    rows.forEach((r, i) => {
      const y = startY + 10 + i * 30;
      const isMe = !highlighted && myNick != null && r.nickname === myNick && r.score === myScore;
      if (isMe) highlighted = true;
      const color = isMe ? PALETTE.roseHex : PALETTE.ink;
      const rankStr = ['🥇', '🥈', '🥉'][i] || `${i + 1}`;
      this.add.text(46, y, rankStr, { fontSize: '15px', color }).setOrigin(0, 0.5);
      this.add.text(84, y, r.nickname, { fontSize: '15px', color, fontStyle: isMe ? 'bold' : 'normal' }).setOrigin(0, 0.5);
      this.add.text(GAME_WIDTH - 46, y, r.score.toLocaleString('en-US'), { fontSize: '15px', color }).setOrigin(1, 0.5);
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
