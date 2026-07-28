import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from './config/constants.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { PrologueScene } from './scenes/PrologueScene.js';
import { GameScene } from './scenes/GameScene.js';
import { DialogueScene } from './scenes/DialogueScene.js';
import { RankingScene } from './scenes/RankingScene.js';

// 팬덤 세로 슈팅 파일럿 — 빛의 세계(DIA)
// 모바일 세로 480×800 논리 해상도 / 터치 드래그 이동 / 자동 발사 (§5.1, §9)
const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: PALETTE.deepHex || '#0d0b1a',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  roundPixels: true,
  dom: { createContainer: true }, // 닉네임 입력 DOM 오버레이용
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [BootScene, TitleScene, PrologueScene, GameScene, DialogueScene, RankingScene],
};

const game = new Phaser.Game(config);

// 개발/스모크 테스트용 전역 핸들 (프로덕션 동작에는 영향 없음)
if (typeof window !== 'undefined') window.__game = game;
