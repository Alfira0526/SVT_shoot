import Phaser from 'phaser';
import { COLORS, GAME_H, GAME_W } from './config/constants.js';
import BootScene from './scenes/Boot.js';
import TitleScene from './scenes/Title.js';
import PrologueScene from './scenes/Prologue.js';
import GameScene from './scenes/Game.js';
import DialogueOverlay from './scenes/DialogueOverlay.js';
import PauseOverlay from './scenes/PauseOverlay.js';
import ResultScene from './scenes/Result.js';
import RankingScene from './scenes/Ranking.js';
import { registerSW } from 'virtual:pwa-register';

// PWA 서비스 워커 — 새 배포가 있으면 자동 갱신 (vite-plugin-pwa)
registerSW({ immediate: true });

// 논리 해상도 480×800 세로, 기기별 스케일링 (§5)
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: COLORS.deep,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_W,
    height: GAME_H,
  },
  render: {
    antialias: true,
    roundPixels: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { x: 0, y: 0 },
    },
  },
  input: {
    activePointers: 2,
  },
  scene: [BootScene, TitleScene, PrologueScene, GameScene, DialogueOverlay, PauseOverlay, ResultScene, RankingScene],
};

window.__fanShooter = new Phaser.Game(config);
