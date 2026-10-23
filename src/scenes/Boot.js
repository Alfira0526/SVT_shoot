import Phaser from 'phaser';
import { CSS, GAME_H, GAME_W, TITLE } from '../config/constants.js';
import { loadOptionalImages } from '../systems/Assets.js';
import { createIconTextures, createPlaceholderTextures } from '../systems/Textures.js';
import { retryPending } from '../net/supabase.js';
import { textStyle } from '../systems/ui.js';

const TIPS = [
  '드래그로 이동 — 발사는 자동이야.',
  '응원봉을 먹으면 탄이 3열로 늘어나.',
  '새로고침은 죄악이다. (서버 曰)',
  '민들레 꽃씨는 잔기 +1. 놓치지 마.',
  '단결 실드는 3초. 탄막 속으로 돌진할 타이밍!',
];

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.add
      .text(GAME_W / 2, GAME_H / 2 - 30, TITLE, textStyle(34, CSS.cream, { fontStyle: 'bold' }))
      .setOrigin(0.5);
    const tip = Phaser.Utils.Array.GetRandom(TIPS);
    this.add
      .text(GAME_W / 2, GAME_H / 2 + 24, `봉이: ${tip}`, textStyle(15, CSS.serenity))
      .setOrigin(0.5);

    // 선택 에셋(도트·컷씬·초상화)이 있으면 먼저 로드 → 없는 키만 임시 도형으로 생성
    loadOptionalImages(this)
      .catch(() => [])
      .then(() => {
        createIconTextures(this);
        createPlaceholderTextures(this);
        retryPending();
        this.scene.start('Title');
      });
  }
}
