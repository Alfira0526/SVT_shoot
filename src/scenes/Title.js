import Phaser from 'phaser';
import { COLORS, CONTACT_URL, CSS, DEPTH, GAME_H, GAME_W, INFO_LINES, SUBTITLE, TITLE, VERSION } from '../config/constants.js';
import { Audio } from '../systems/Audio.js';
import { Storage } from '../systems/Storage.js';
import { promptNickname } from '../systems/NicknameUI.js';
import { makeButton, makePanel, textStyle } from '../systems/ui.js';
import { drawVerticalGradient } from '../systems/Textures.js';
import { isOnline } from '../net/supabase.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const g = this.add.graphics().setDepth(DEPTH.backdrop);
    drawVerticalGradient(g, 0, 0, GAME_W, GAME_H, COLORS.deep, 0x4a2f7f);
    this.stars = this.add.tileSprite(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 'stars').setDepth(DEPTH.stars);

    // 응원봉 글로우
    this.glow = this.add.image(GAME_W / 2, 250, 'glow').setScale(5).setTint(COLORS.lemon).setAlpha(0.5);
    if (this.textures.exists('emblem')) this.add.image(GAME_W / 2, 240, 'emblem');
    else this.add.image(GAME_W / 2, 250, 'player').setScale(4);

    this.add
      .text(GAME_W / 2, 360, TITLE, textStyle(52, CSS.cream, { fontStyle: 'bold', stroke: CSS.ink, strokeThickness: 8 }))
      .setOrigin(0.5);
    this.add.text(GAME_W / 2, 406, SUBTITLE, textStyle(16, CSS.serenity)).setOrigin(0.5);

    makeButton(this, GAME_W / 2, 490, '게임 시작', () => this.startGame(), { color: COLORS.rose });
    makeButton(this, GAME_W / 2, 560, '랭킹 보기', () => this.scene.start('Ranking'), { color: COLORS.serenity });
    makeButton(this, GAME_W / 2, 630, '설정', () => this.openSettings(), { color: COLORS.grape });

    this.nickText = this.add
      .text(GAME_W / 2, 700, '', textStyle(16, CSS.cream))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.nickText.on('pointerup', () => this.changeNickname());
    this.refreshNick();

    const progress = Storage.getProgress();
    const best = progress.bestScore ? `최고 기록 ${progress.bestScore.toLocaleString()}` : '첫 출격을 기다리는 중';
    this.add.text(GAME_W / 2, 728, best, textStyle(13, CSS.gray)).setOrigin(0.5);
    this.add
      .text(GAME_W / 2, GAME_H - 36, `${VERSION} · ${isOnline() ? '온라인 랭킹' : '오프라인(이 기기) 랭킹'} · 비영리 팬 창작`, textStyle(11, CSS.gray))
      .setOrigin(0.5);
    this.add
      .text(GAME_W / 2, GAME_H - 18, '아이콘: game-icons.net (CC BY 3.0) · 사운드·코드: 자체 제작', textStyle(11, CSS.gray))
      .setOrigin(0.5);

    this.cameras.main.fadeIn(400, 0, 0, 0);
    Audio.playBgm('title');
  }

  update(time) {
    this.stars.tilePositionY -= 0.25;
    this.glow.setAlpha(0.4 + Math.sin(time / 500) * 0.15);
  }

  refreshNick() {
    const nick = Storage.getNickname();
    this.nickText.setText(nick ? `수호자: ${nick}  (변경)` : '닉네임 미설정 — 탭해서 입력');
  }

  async changeNickname() {
    Audio.sfx('click');
    await promptNickname(this, { allowCancel: true, initial: Storage.getNickname() || '' });
    this.refreshNick();
  }

  async startGame() {
    Audio.unlock();
    if (!Storage.getNickname()) {
      const nick = await promptNickname(this, { allowCancel: false });
      if (!nick) return;
      this.refreshNick();
    }
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Prologue'));
  }

  openSettings() {
    if (this.settingsPanel) return;
    const s = Storage.getSettings();
    const items = [];
    const dim = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.55).setDepth(DEPTH.overlay).setInteractive();
    const panel = makePanel(this, GAME_W / 2, GAME_H / 2, 320, 400).setDepth(DEPTH.overlay + 1);
    const title = this.add.text(GAME_W / 2, GAME_H / 2 - 165, '설정', textStyle(24, CSS.cream, { fontStyle: 'bold' })).setOrigin(0.5).setDepth(DEPTH.overlay + 2);
    const label = (on, name) => `${name}: ${on ? '켬' : '끔'}`;
    const closeAll = () => {
      items.forEach((o) => o.destroy());
      this.settingsPanel = null;
    };
    const bgmBtn = makeButton(this, GAME_W / 2, GAME_H / 2 - 110, label(s.bgm, 'BGM'), () => {
      s.bgm = !s.bgm;
      Audio.applySettings({ ...s });
      bgmBtn.setLabel(label(s.bgm, 'BGM'));
    }, { w: 240, color: COLORS.serenity }).setDepth(DEPTH.overlay + 2);
    const sfxBtn = makeButton(this, GAME_W / 2, GAME_H / 2 - 45, label(s.sfx, '효과음'), () => {
      s.sfx = !s.sfx;
      Audio.applySettings({ ...s });
      sfxBtn.setLabel(label(s.sfx, '효과음'));
    }, { w: 240, color: COLORS.serenity }).setDepth(DEPTH.overlay + 2);
    const infoBtn = makeButton(this, GAME_W / 2, GAME_H / 2 + 20, '정보 · 크레딧', () => {
      closeAll();
      this.openInfo();
    }, { w: 240, color: COLORS.grape }).setDepth(DEPTH.overlay + 2);
    const resetBtn = makeButton(this, GAME_W / 2, GAME_H / 2 + 85, '기록 초기화', () => {
      if (resetBtn.confirming) {
        ['fs_nickname', 'fs_progress', 'fs_settings', 'fs_tutorial_seen', 'fs_ranking_local', 'fs_pending_scores', 'fs_last_submit'].forEach((k) => localStorage.removeItem(k));
        closeAll();
        this.scene.restart();
        return;
      }
      resetBtn.confirming = true;
      resetBtn.setLabel('정말 지울까요? (다시 탭)');
    }, { w: 240, color: COLORS.panel, textColor: CSS.danger, fontSize: 18 }).setDepth(DEPTH.overlay + 2);
    const close = makeButton(this, GAME_W / 2, GAME_H / 2 + 150, '닫기', closeAll, { w: 240, color: COLORS.rose }).setDepth(DEPTH.overlay + 2);
    items.push(dim, panel, title, bgmBtn, sfxBtn, infoBtn, resetBtn, close);
    this.settingsPanel = items;
  }

  // §12 BM·§7 IP 원칙·§14 문의 채널을 게임 안에서 고지
  openInfo() {
    const items = [];
    const dim = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.6).setDepth(DEPTH.overlay).setInteractive();
    const panel = makePanel(this, GAME_W / 2, GAME_H / 2, 400, 560).setDepth(DEPTH.overlay + 1);
    const title = this.add.text(GAME_W / 2, GAME_H / 2 - 245, `${TITLE} ${VERSION}`, textStyle(20, CSS.cream, { fontStyle: 'bold' })).setOrigin(0.5).setDepth(DEPTH.overlay + 2);
    const body = this.add
      .text(GAME_W / 2 - 180, GAME_H / 2 - 210, INFO_LINES.map((l) => `· ${l}`).join('\n\n'), textStyle(14, CSS.cream, { wordWrap: { width: 360 }, lineSpacing: 4 }))
      .setDepth(DEPTH.overlay + 2);
    const credits = this.add
      .text(
        GAME_W / 2 - 180,
        GAME_H / 2 + 20,
        '아이콘: game-icons.net — Lorc, Delapouite, DarkZaitzev, Willdabeast, Faithtoken (CC BY 3.0)\n엔진: Phaser 3 (MIT) · 빌드: Vite (MIT)\n사운드·코드·세계관: 자체 제작',
        textStyle(12, CSS.serenity, { wordWrap: { width: 360 }, lineSpacing: 4 })
      )
      .setDepth(DEPTH.overlay + 2);
    const contact = this.add
      .text(GAME_W / 2, GAME_H / 2 + 150, CONTACT_URL ? '문의·제보: 탭해서 열기' : '문의·제보 채널: 준비 중', textStyle(14, CONTACT_URL ? CSS.lemon : CSS.gray))
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay + 2);
    if (CONTACT_URL) {
      contact.setInteractive({ useHandCursor: true });
      contact.on('pointerup', () => window.open(CONTACT_URL, '_blank', 'noopener'));
    }
    const close = makeButton(this, GAME_W / 2, GAME_H / 2 + 220, '닫기', () => items.forEach((o) => o.destroy()), { w: 240, color: COLORS.rose }).setDepth(DEPTH.overlay + 2);
    items.push(dim, panel, title, body, credits, contact, close);
  }
}
