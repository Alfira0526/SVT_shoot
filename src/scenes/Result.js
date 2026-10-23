import Phaser from 'phaser';
import { COLORS, CSS, DEPTH, FALLBACK_NICKNAME, GAME_H, GAME_W, SCORE } from '../config/constants.js';
import { Audio } from '../systems/Audio.js';
import { Storage } from '../systems/Storage.js';
import { makeButton, makePanel, textStyle } from '../systems/ui.js';
import { drawVerticalGradient } from '../systems/Textures.js';
import { portraitKey } from '../systems/Assets.js';
import { isOnline, submitScore } from '../net/supabase.js';
import { fillNickname } from '../systems/Dialogue.js';

// 결과 화면 봉이 코멘트 — 상황별 (스토리 공백 보완: 게임오버·클리어·노미스 반응)
const BONGI_COMMENTS = {
  noMiss: ['한 번도 안 맞았어?! {nickname}, 너 혹시 전생에 방패였니.', '완벽해. 오늘 빛, 기록해 둘게.'],
  clear: ['좌석 확정! 이제 진짜 시작이야, {nickname}.', '봤지? 새로고침보다 빛이 세다니까.'],
  gameover: ['빛은 꺼진 게 아니라 잠깐 흐려진 거야. 다시 가자, {nickname}.', '대기열은 다시 열려. 응원봉 꽉 쥐고, 한 번 더.'],
};

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  init(data) {
    this.run = data.run;
    this.cleared = Boolean(data.cleared);
    this.submitted = false;
  }

  create() {
    const run = this.run;
    const nickname = Storage.getNickname() || FALLBACK_NICKNAME;
    const noMiss = this.cleared && run.hits === 0;
    const bonus = noMiss ? SCORE.noMiss : 0;
    this.finalScore = run.score + bonus;
    this.playMs = Date.now() - run.startedAt;

    const progress = Storage.getProgress();
    Storage.updateProgress({
      bestScore: Math.max(progress.bestScore || 0, this.finalScore),
      noMissClear: progress.noMissClear || noMiss,
    });

    const g = this.add.graphics().setDepth(DEPTH.backdrop);
    drawVerticalGradient(g, 0, 0, GAME_W, GAME_H, COLORS.deep, this.cleared ? 0x3f2f7a : 0x2a1f3f);
    this.add.tileSprite(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 'stars').setDepth(DEPTH.stars);

    const title = this.cleared ? (noMiss ? '예매 완료 · 노미스!' : '예매 완료!') : 'GAME OVER';
    this.add.text(GAME_W / 2, 90, title, textStyle(36, this.cleared ? CSS.lemon : CSS.danger, { fontStyle: 'bold', stroke: CSS.ink, strokeThickness: 6 })).setOrigin(0.5);
    this.add.text(GAME_W / 2, 136, `수호자 ${nickname}`, textStyle(16, CSS.serenity)).setOrigin(0.5);

    makePanel(this, GAME_W / 2, 300, 380, 230);
    const rows = [
      ['기본 점수', run.score.toLocaleString()],
      ['노미스 보너스', noMiss ? `+${bonus.toLocaleString()}` : '—'],
      ['격파한 손님', `${run.stats?.enemies ?? 0}`],
      ['플레이 시간', `${Math.round(this.playMs / 1000)}초`],
    ];
    rows.forEach(([k, v], i) => {
      const y = 222 + i * 34;
      this.add.text(GAME_W / 2 - 160, y, k, textStyle(17, CSS.gray));
      this.add.text(GAME_W / 2 + 160, y, v, textStyle(17, CSS.cream)).setOrigin(1, 0);
    });
    this.add.text(GAME_W / 2 - 160, 368, '최종 점수', textStyle(20, CSS.lemon, { fontStyle: 'bold' }));
    this.add.text(GAME_W / 2 + 160, 364, this.finalScore.toLocaleString(), textStyle(28, CSS.lemon, { fontStyle: 'bold' })).setOrigin(1, 0);

    // 봉이 코멘트
    const pool = noMiss ? BONGI_COMMENTS.noMiss : this.cleared ? BONGI_COMMENTS.clear : BONGI_COMMENTS.gameover;
    const comment = fillNickname(Phaser.Utils.Array.GetRandom(pool), nickname);
    this.add.image(70, 470, portraitKey(this, 'bongi_smile')).setScale(0.8);
    const bubble = this.add.graphics();
    bubble.fillStyle(COLORS.panel, 0.95);
    bubble.fillRoundedRect(125, 430, 330, 80, 14);
    bubble.lineStyle(2, COLORS.lemon, 0.8);
    bubble.strokeRoundedRect(125, 430, 330, 80, 14);
    this.add.text(140, 440, '봉이', textStyle(13, CSS.lemon, { fontStyle: 'bold' }));
    this.add.text(140, 460, comment, textStyle(15, CSS.cream, { wordWrap: { width: 300 } }));

    this.status = this.add.text(GAME_W / 2, 548, isOnline() ? '온라인 랭킹에 제출할 수 있어요.' : '오프라인 — 이 기기 랭킹에 기록돼요.', textStyle(13, CSS.serenity)).setOrigin(0.5);

    this.submitBtn = makeButton(this, GAME_W / 2 - 80, 600, '랭킹 제출', () => this.submit(), { w: 150, color: COLORS.rose, fontSize: 18 });
    this.shareBtn = makeButton(this, GAME_W / 2 + 80, 600, '결과 공유', () => this.share(), { w: 150, color: COLORS.lemon, fontSize: 18 });
    makeButton(this, GAME_W / 2 - 80, 665, '다시하기', () => {
      Audio.stopBgm();
      this.scene.start('Game', { stageId: 'w1' });
    }, { w: 150, color: COLORS.serenity, fontSize: 18 });
    makeButton(this, GAME_W / 2 + 80, 665, '랭킹 보기', () => this.scene.start('Ranking'), { w: 150, color: COLORS.grape, fontSize: 18 });
    makeButton(this, GAME_W / 2, 730, '타이틀로', () => this.scene.start('Title'), { w: 300, color: COLORS.panel, textColor: CSS.cream, fontSize: 18 });

    this.cameras.main.fadeIn(400, 0, 0, 0);
    Audio.playBgm('title');
  }

  // 팬덤 확산용 결과 공유 — Web Share API, 미지원 시 클립보드 복사
  async share() {
    const nickname = Storage.getNickname() || FALLBACK_NICKNAME;
    const text = `${nickname} 수호자, ${this.cleared ? '예매 성공' : '대기열 탈락'} — ${this.finalScore.toLocaleString()}점 #덕질할결심`;
    const url = location.href.split('#')[0];
    try {
      if (navigator.share) {
        await navigator.share({ title: '덕질할 결심', text, url });
        this.status.setText('공유했어요!');
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      this.status.setText('결과 문구를 복사했어요. 붙여넣어 자랑하세요!');
    } catch {
      this.status.setText('공유가 취소됐어요.');
    }
  }

  async submit() {
    if (this.submitted) return;
    const nickname = Storage.getNickname() || FALLBACK_NICKNAME;
    this.status.setText('제출 중…');
    const res = await submitScore({ nickname, score: this.finalScore, play_ms: this.playMs, mode: 'stage' });
    if (res.ok) {
      this.submitted = true;
      this.submitBtn.setLabel('제출 완료 ✓');
      this.status.setText(res.local ? '이 기기 랭킹에 기록했어요.' : '온라인 랭킹에 등록됐어요!');
    } else {
      this.status.setText(res.reason || '제출에 실패했어요.');
      if (res.queued) this.submitted = true;
    }
  }
}
