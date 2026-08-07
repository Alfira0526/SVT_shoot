import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from './config/constants.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { PrologueScene } from './scenes/PrologueScene.js';
import { GameScene } from './scenes/GameScene.js';
import { EndlessScene } from './scenes/EndlessScene.js';
import { GuardianScene } from './scenes/GuardianScene.js';
import { DialogueScene } from './scenes/DialogueScene.js';
import { RankingScene } from './scenes/RankingScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';

// 팬덤 세로 슈팅 파일럿 — 빛의 세계(온빛)
// 모바일 세로 480×800 논리 해상도 / 터치 드래그 이동 / 자동 발사 (§5.1, §9)
const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: PALETTE.deepHex || '#0d0b1a',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true, // antialias off + nearest-neighbor (도트 선명)
  roundPixels: true,
  dom: { createContainer: true }, // 닉네임 입력 DOM 오버레이용
  scale: {
    mode: Phaser.Scale.FIT, // 480×800 비율 유지, 기기별 레터박스 스케일링
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true, // 정수 픽셀 정렬 (모바일 흐림 방지)
  },
  render: {
    powerPreference: 'high-performance',
    antialias: false,
  },
  fps: { target: 60, min: 30 }, // §9-7 실기기 60fps 근접 목표
  input: {
    activePointers: 2, // 멀티터치 여유 (드래그 중 오터치 흡수)
    touch: { capture: true },
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [BootScene, TitleScene, PrologueScene, GameScene, EndlessScene, GuardianScene, DialogueScene, RankingScene, SettingsScene],
};

const game = new Phaser.Game(config);

// 개발/스모크 테스트용 전역 핸들 (프로덕션 동작에는 영향 없음)
if (typeof window !== 'undefined') window.__game = game;
