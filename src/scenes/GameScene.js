import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE, PLAYER, SCORE, theoreticalMaxScore } from '../config/constants.js';
import { Player } from '../entities/Player.js';
import { Enemy, createEnemyGroup } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { Item, createItemGroup, itemXToPixels } from '../entities/Item.js';
import { createBulletGroup } from '../entities/Bullet.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { WaveSpawner } from '../systems/WaveSpawner.js';
import { Save } from '../systems/SaveSystem.js';
import { applyLoadout } from '../systems/Loadout.js';
import { levelFromExp } from '../config/leveling.js';
import { safeDisplayName } from '../systems/Filter.js';
import { Audio } from '../systems/Audio.js';

import stageW1 from '../config/stage_w1.json';
import stageW2 from '../config/stage01.json';
import stageW3 from '../config/stage_w3.json';
import stageW4 from '../config/stage_w4.json';
import stageFinal from '../config/stage_final.json';
import dialogueW1 from '../config/dialogue_w1.json';
import dialogueW2 from '../config/dialogue01.json';
import dialogueW3 from '../config/dialogue_w3.json';
import dialogueW4 from '../config/dialogue_w4.json';
import dialogueFinal from '../config/dialogue_final.json';
import guardians from '../config/guardians.json';
import worldsCfg from '../config/worlds.json';
import worldDialogue from '../config/dialogue_worlds.json';

const WORLDS_BY_ID = {};
worldsCfg.worlds.forEach((w) => { WORLDS_BY_ID[w.id] = w; });
const GUARDIAN_NAME = {};
guardians.roster.forEach((g) => { GUARDIAN_NAME[g.id] = g.name; });

const STAGES = { w1: stageW1, w2: stageW2, w3: stageW3, w4: stageW4, final: stageFinal };
const DIALOGUES = { w1: dialogueW1, w2: dialogueW2, w3: dialogueW3, w4: dialogueW4, final: dialogueFinal };
// 캠페인 순서: W1 → W2 → W3 → W4(콘서트 현장) → Final(흑막전) → 에필로그 → 랭킹
const NEXT = { w1: 'w2', w2: 'w3', w3: 'w4', w4: 'final', final: null };
// 수호자 챕터: 각 스테이지 클리어 = 그 스테이지에 묶인 수호자 각성 (조우/각성 비트)
const GUARDIAN_BY_STAGE = {};
guardians.roster.forEach((g) => { if (g.stage) GUARDIAN_BY_STAGE[g.stage] = g; });

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    // 다중세계 모드: worldId → 세계의 stageRef 레이아웃 사용, 클리어 시 세계 정령 각성
    this._world = data.worldId ? WORLDS_BY_ID[data.worldId] : null;
    this.stageId = this._world ? this._world.stageRef : (data.stageId || 'w2');
    this.stage = STAGES[this.stageId];
    // 세계 난도 스케일 — 진행 순서대로 몹 HP·속도·탄속·보스HP 상승 (레벨 커브)
    if (this._world) {
      const d = this._world.difficulty || 1;
      this._enemyHpMul = 1 + (d - 1) * 0.12;
      this._enemySpdMul = 1 + (d - 1) * 0.05;
      this._bulletSpdMul = 1 + (d - 1) * 0.05;
      this._bossHp = 550 + d * 280; // diff1≈830 … diff7≈2510 (파워2 기준 5~14초)
    } else {
      this._enemyHpMul = 1; this._enemySpdMul = 1; this._bulletSpdMul = 1; this._bossHp = null;
    }
    this.nickname = safeDisplayName(this.registry.get('nickname'));
    this.phase = 'intro'; // intro | fighting | boss_intro | boss | outro | clear | over
    // scene.start는 Game 인스턴스를 재사용 → 스테이지 전환 시 이월점수 적용 플래그를 반드시 리셋
    // (미리셋 시 W1에서 세팅된 채 W2로 넘어와 W1→W2 누적점수가 유실됨)
    this._carryApplied = false;
    this._midBarkShown = false;
    this._dev = Save.getDev(); // QA 개발자 모드 — 무제한 라이프(무적)
    // 세계 모드는 세계 정령을 클리어 시 각성(조우 대사 미사용). 구 선형 스테이지만 챕터 수호자 사용.
    this._guardian = this._world ? null : (GUARDIAN_BY_STAGE[this.stageId] || null);

    // 플레이 시간 측정 시작점 (§6 서버 검증 ② score/play_ms). W1 진입 시 리셋.
    if (this.stageId === 'w1') this.registry.set('playStartMs', Date.now());
  }

  create() {
    this.score = new ScoreSystem();
    this.paused = false;
    this._buildBackground();
    this._buildGroups();

    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 120);
    applyLoadout(this, this.player); // 장착 수호자 → 탄 색·파워·연사

    this._buildHud();
    this._buildCollisions();

    // 씬 시작: 물리 정지 후 인트로 대사
    this.physics.world.pause();
    if (this._world) this._showBanner(this._world.name, this._world.sub);
    else this._showBanner(this.stage.title, this.stage.subtitle);

    this.time.delayedCall(900, () => {
      if (this._world) { this._worldBriefing(() => this._playWorldIntro(() => this._startWaves())); return; } // 브리핑 → 인트로/조우
      // 수호자 챕터 '조우' 비트 — 아직 각성 전이면 스테이지 인트로 앞에 삽입
      const gd = this._guardian;
      if (gd && gd.encounter && !Save.isGuardianAwake(gd.id)) {
        this._playLines(gd.encounter, () => this._dialogue('intro', () => this._startWaves()));
      } else {
        this._dialogue('intro', () => this._startWaves());
      }
    });
  }

  // 임의 대사 라인 재생 (수호자 조우/각성 등 stageId 밖 대사)
  _playLines(lines, onDone) {
    if (!lines || lines.length === 0) { onDone?.(); return; }
    this._launchDialogue(lines, onDone);
  }

  // ── 배경 ────────────────────────────────────────────────
  _buildBackground() {
    const tint = PALETTE[this.stage.bgTint] || PALETTE.deep;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, tint).setOrigin(0).setDepth(-10);
    // 세계별 색 정체성 — 은은한 색 워시 + 별 색조로 각 세계를 다르게 (몰입)
    const wc = this._world ? (PALETTE[this._world.color] || PALETTE.serenity) : null;
    if (wc) this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, wc, 0.12).setOrigin(0).setDepth(-9.6);
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      const s = this.add
        .image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT), 'star')
        .setDepth(-9)
        .setAlpha(Phaser.Math.FloatBetween(0.2, 0.8))
        .setTint(wc ? (i % 3 === 0 ? wc : PALETTE.light) : (i % 3 === 0 ? PALETTE.rose : PALETTE.serenity));
      s.speed = Phaser.Math.Between(20, 70);
      this.stars.push(s);
    }
  }

  // ── 그룹 ────────────────────────────────────────────────
  _buildGroups() {
    this.playerBullets = createBulletGroup(this, 'bullet_player', 200);
    this.enemyBullets = createBulletGroup(this, 'bullet_enemy', 400);
    this.enemies = createEnemyGroup(this, 48);
    this.items = createItemGroup(this, 10);
  }

  // ── HUD ─────────────────────────────────────────────────
  _buildHud() {
    // 일시정지 버튼 (좌상단, §11)
    this.pauseBtn = this.add
      .text(16, 14, '⏸', { fontSize: '22px', color: PALETTE.ink })
      .setDepth(20)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerdown', () => this._togglePause());

    this.scoreText = this.add
      .text(52, 10, '0', { fontSize: '20px', color: PALETTE.ink, fontStyle: 'bold' })
      .setDepth(20)
      .setScrollFactor(0);
    this.add
      .text(52, 34, 'SCORE', { fontSize: '10px', color: PALETTE.serenityHex })
      .setDepth(20);

    this.livesText = this.add
      .text(GAME_WIDTH - 12, 10, '', { fontSize: '20px', color: PALETTE.dangerHex })
      .setOrigin(1, 0)
      .setDepth(20);
    this._refreshLives();

    // 보스 HP 바 (초기 숨김)
    this.bossHpBg = this.add.graphics().setDepth(20).setVisible(false);
    this.bossHpBar = this.add.graphics().setDepth(21).setVisible(false);
    this.bossHpText = this.add
      .text(GAME_WIDTH / 2, 60, '', { fontSize: '13px', color: PALETTE.ink })
      .setOrigin(0.5)
      .setDepth(22)
      .setVisible(false);
    this.bossNameText = this.add
      .text(GAME_WIDTH / 2, 44, '', { fontSize: '12px', color: PALETTE.dangerHex, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(22)
      .setVisible(false);
  }

  _refreshLives() {
    if (this._dev) { this.livesText.setText('DEV ∞'); return; } // 무제한 라이프
    this.livesText.setText('♥ '.repeat(Math.max(0, this.player?.lives ?? 0)).trim() || '—');
  }

  _buildCollisions() {
    this.physics.add.overlap(this.playerBullets, this.enemies, this._hitEnemy, null, this);
    this.physics.add.overlap(this.enemyBullets, this.player, this._hitPlayer, null, this);
    this.physics.add.overlap(this.enemies, this.player, this._contactPlayer, null, this);
    this.physics.add.overlap(this.items, this.player, this._pickup, null, this);
  }

  // ── 대사 오버레이 ────────────────────────────────────────
  _dialogue(key, onDone) {
    const set = DIALOGUES[this.stageId];
    const lines = set && set[key];
    if (!lines || lines.length === 0) {
      onDone?.();
      return;
    }
    this._launchDialogue(lines, onDone);
  }

  // 대사 오버레이 공통 런처 — 대사 중 GameScene 입력을 끄고(탭이 플레이어 조준으로 새지 않게),
  // 완료 시 입력 복구 + 조준을 현재 위치로 리셋(물리 재개 시 마지막 탭 위치로 순간이동 방지).
  _launchDialogue(lines, onDone) {
    this.input.enabled = false;
    this.scene.launch('Dialogue', {
      lines,
      nickname: this.nickname,
      onComplete: () => {
        this.input.enabled = true;
        if (this.player) this.player.target.set(this.player.x, this.player.y);
        onDone?.();
      },
    });
  }

  _showBanner(title, subtitle) {
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(30);
    const t = this.add.text(0, -12, title, { fontSize: '30px', color: PALETTE.ink, fontStyle: 'bold' }).setOrigin(0.5);
    const s = this.add.text(0, 24, subtitle, { fontSize: '14px', color: PALETTE.serenityHex }).setOrigin(0.5);
    c.add([t, s]);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 400, yoyo: true, hold: 1000, onComplete: () => c.destroy() });
  }

  // ── 웨이브 → 보스 ────────────────────────────────────────
  _startWaves() {
    this.phase = 'fighting';
    this.physics.world.resume();
    this.spawner = new WaveSpawner(this, this.stage, {
      spawnEnemy: (type, x, y) => this._spawnEnemy(type, x, y),
      spawnItem: (kind, x) => this._spawnItem(kind, x),
    });
    this.spawner.start(() => this._bossIntro());

    // 첫 플레이 튜토리얼 오버레이 (§11) — 최초 1회, 비차단
    if (this.stageId === 'w1' && !Save.getFlag('tutorialSeen')) this._showTutorial();
  }

  _showTutorial() {
    Save.setFlag('tutorialSeen');
    const c = this.add.container(0, 0).setDepth(28);
    const dim = this.add.rectangle(0, GAME_HEIGHT - 220, GAME_WIDTH, 120, 0x000000, 0.55).setOrigin(0);
    const msg = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 176, '드래그로 이동 — 발사는 자동', {
        fontSize: '18px',
        color: PALETTE.ink,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const finger = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 138, '👆', { fontSize: '26px' }).setOrigin(0.5);
    c.add([dim, msg, finger]);
    // 손가락 좌우 흔들기
    this.tweens.add({ targets: finger, x: GAME_WIDTH / 2 + 40, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // 3.5초 후 또는 첫 이동 시 사라짐
    const dismiss = () => {
      if (!c.active) return;
      this.tweens.add({ targets: c, alpha: 0, duration: 400, onComplete: () => c.destroy() });
    };
    this.time.delayedCall(3500, dismiss);
    this.input.once('pointermove', dismiss);
  }

  _bossIntro() {
    if (this.phase === 'over') return;
    this.phase = 'boss_intro';
    // 남은 잡몹 정리 대기 없이 바로 보스 대사
    this.physics.world.pause();
    if (this._world) { this._startBoss(); return; } // 세계 보스 대사는 후속
    this._dialogue('boss', () => this._startBoss());
  }

  _startBoss() {
    this.phase = 'boss';
    this.physics.world.resume();
    this.boss = new Boss(this, this._bossHp ? { ...this.stage.boss, hp: this._bossHp } : this.stage.boss);
    this.physics.add.overlap(this.playerBullets, this.boss, this._hitBoss, null, this);

    this.bossNameText.setText(this._world ? this._world.threat : this.stage.boss.name).setVisible(true);
    this.bossHpBg.setVisible(true);
    this.bossHpBar.setVisible(true);
    this.bossHpText.setVisible(true);

    this.boss.enter();
    if (this._world) this._bossMeaningCard(); // 이 세계 위협의 정체를 직관적으로
  }

  // 보스 등장 시 '정체' 명패 — 무엇이고 왜 이 세계의 위협인지 (직관적 이해)
  _bossMeaningCard() {
    const w = this._world;
    const c = this.add.container(GAME_WIDTH / 2, 150).setDepth(24).setScrollFactor(0);
    const g = this.add.graphics();
    g.fillStyle(0x161327, 0.94); g.fillRoundedRect(-GAME_WIDTH / 2 + 24, -46, GAME_WIDTH - 48, 92, 12);
    g.lineStyle(2, PALETTE.danger, 0.85); g.strokeRoundedRect(-GAME_WIDTH / 2 + 24, -46, GAME_WIDTH - 48, 92, 12);
    c.add(g);
    c.add(this.add.text(0, -28, `⚠ ${w.threat}`, { fontSize: '19px', color: PALETTE.dangerHex, fontStyle: 'bold' }).setOrigin(0.5));
    c.add(this.add.text(0, 8, w.threatDesc, { fontSize: '12px', color: PALETTE.ink, align: 'center', wordWrap: { width: GAME_WIDTH - 84 }, lineSpacing: 4 }).setOrigin(0.5));
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 300, yoyo: true, hold: 2800, onComplete: () => c.destroy() });
  }

  _bossDefeated() {
    this.phase = 'outro';
    this.physics.world.pause();
    // 화면에 얼어붙은 적탄 정리 — 클리어 연출이 깔끔하게 보이도록
    this.enemyBullets.children.each((b) => { if (b.active) b.deactivate(); });
    this.score.addBossKill();
    this._syncScore();
    Audio.sfx('explode');
    this.boss.defeatSequence(() => {
      // 격파 연출: 스테이지별 배너 (기본=예매 성공)
      const cb = this.stage.clearBanner || { title: '예매 성공', subtitle: 'SEAT CONFIRMED' };
      this._showBanner(cb.title, cb.subtitle);
      this.cameras.main.flash(300, 255, 245, 200);
      this._confetti();
      this.time.delayedCall(1400, () => {
        if (this._world) this._afterOutro();
        else this._dialogue('outro', () => this._afterOutro());
      });
    });
  }

  // 아웃트로 후 — 수호자 '각성' 비트(최초 1회) → 클리어
  _afterOutro() {
    const gd = this._guardian;
    if (gd && gd.awaken && !Save.isGuardianAwake(gd.id)) {
      this._playLines(gd.awaken, () => {
        Save.awakenGuardian(gd.id);
        this._awakenCelebrate(gd, () => this._clear());
      });
    } else {
      this._clear();
    }
  }

  // 각성 연출 — 수호자 초상화 상승 + 이름/빛 + 반짝임
  _awakenCelebrate(gd, onDone) {
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(45);
    c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0716, 0.82).setOrigin(0.5));
    const count = 1 + Save.getAwakenedGuardians().length; // 루멘 포함
    c.add(this.add.text(0, -170, '새로운 수호자 각성', { fontSize: '20px', color: PALETTE.goldHex, fontStyle: 'bold' }).setOrigin(0.5));
    const port = this.add.image(0, -40, this.textures.exists(gd.portrait) ? gd.portrait : 'pt_g_bongi').setScale(1.4);
    c.add(port);
    c.add(this.add.text(0, 70, gd.name, { fontSize: '34px', color: PALETTE.ink, fontStyle: 'bold' }).setOrigin(0.5));
    c.add(this.add.text(0, 108, gd.light, { fontSize: '16px', color: PALETTE.roseHex }).setOrigin(0.5));
    c.add(this.add.text(0, 150, `수호자 ${count} / 14`, { fontSize: '13px', color: PALETTE.inkDim }).setOrigin(0.5));
    const p = this.add.particles(0, -40, 'spark', {
      speed: { min: 40, max: 160 }, scale: { start: 1, end: 0 }, lifespan: 900, frequency: 60,
      tint: [PALETTE.light, PALETTE.rose, PALETTE.gold], blendMode: 'ADD',
    });
    c.add(p);
    port.setScale(0.2).setAlpha(0);
    this.tweens.add({ targets: port, scale: 1.4, alpha: 1, duration: 520, ease: 'Back.easeOut' });
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 300 });
    Audio.sfx('powerup');
    this.time.delayedCall(2600, () => {
      this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => { c.destroy(); onDone?.(); } });
    });
  }

  _clear() {
    this.phase = 'clear';
    this._awardGuardianExp(45); // 장착 수호자 육성
    if (this._world) { this._clearWorld(); return; } // 다중세계 모드 → 정령 각성 후 지도로
    Save.markStageCleared(this.stageId);
    const next = NEXT[this.stageId];
    // 최종 스테이지 클리어 & 에필로그 지정(D37) → 밤하늘 연출 + 에필로그 대사 후 랭킹
    if (!next && this.stage.epilogue) {
      this._runEpilogue();
      return;
    }
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (next) {
        // 다음 월드로 (점수·노미스 상태 유지: registry 이관)
        this.registry.set('carryScore', this.score.score);
        this.registry.set('carryMissed', this.score.missed);
        this.scene.start('Game', { stageId: next });
      } else {
        this._toRanking(false);
      }
    });
  }

  // 세계 진입 브리핑 — 상황·위협·목표를 명확히(직관적 이해 + 진입 몰입)
  _worldBriefing(onDone) {
    const w = this._world;
    const accentHex = { danger: PALETTE.dangerHex, serenity: PALETTE.serenityHex, mint: '#8fdcc2', lavender: '#c9b8e8', rose: PALETTE.roseHex, gold: PALETTE.goldHex }[w.color] || PALETTE.serenityHex;
    const accent = PALETTE[w.color] || PALETTE.serenity;
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(42);
    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0716, 0.92).setOrigin(0.5).setInteractive();
    c.add(dim);
    const g = this.add.graphics();
    g.lineStyle(2, accent, 0.8); g.strokeRoundedRect(-GAME_WIDTH / 2 + 28, -210, GAME_WIDTH - 56, 420, 16);
    c.add(g);
    c.add(this.add.text(0, -178, w.sub, { fontSize: '13px', color: accentHex }).setOrigin(0.5));
    c.add(this.add.text(0, -150, w.name, { fontSize: '30px', fontStyle: 'bold', color: PALETTE.ink }).setOrigin(0.5));
    c.add(this.add.text(0, -92, w.situation, { fontSize: '15px', color: PALETTE.ink, align: 'center', wordWrap: { width: GAME_WIDTH - 100 }, lineSpacing: 6 }).setOrigin(0.5));
    c.add(this.add.text(0, 2, `⚠ 위협 · ${w.threat}`, { fontSize: '15px', color: PALETTE.dangerHex, fontStyle: 'bold' }).setOrigin(0.5));
    c.add(this.add.text(0, 30, w.threatDesc, { fontSize: '12px', color: PALETTE.inkDim, align: 'center', wordWrap: { width: GAME_WIDTH - 100 }, lineSpacing: 5 }).setOrigin(0.5));
    c.add(this.add.text(0, 104, '목표', { fontSize: '12px', color: accentHex, fontStyle: 'bold' }).setOrigin(0.5));
    c.add(this.add.text(0, 130, w.objective, { fontSize: '15px', color: PALETTE.ink, fontStyle: 'bold', align: 'center', wordWrap: { width: GAME_WIDTH - 100 }, lineSpacing: 5 }).setOrigin(0.5));
    const tap = this.add.text(0, 188, '탭하여 진입 ▶', { fontSize: '14px', color: accentHex, fontStyle: 'bold' }).setOrigin(0.5);
    c.add(tap);
    this.tweens.add({ targets: tap, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
    let done = false;
    const go = () => {
      if (done) return; done = true;
      if (this.player) this.player.target.set(this.player.x, this.player.y); // 진입 탭이 조준으로 새지 않게
      this.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: () => { c.destroy(); onDone?.(); } });
    };
    dim.on('pointerdown', go);
    c.setAlpha(0); this.tweens.add({ targets: c, alpha: 1, duration: 300 });
    this.time.delayedCall(8000, go); // 미조작 시 자동 진입
    Audio.sfx('ui');
  }

  // 세계 도착: 인트로 + 아직 못 만난 정령 조우 대사
  _playWorldIntro(onDone) {
    const wd = worldDialogue.worlds[this._world.id];
    const lines = [];
    if (wd) {
      lines.push(...(wd.intro || []));
      (this._world.spirits || []).forEach((sid) => {
        if (!Save.isGuardianAwake(sid) && wd.spirits[sid]) lines.push(...(wd.spirits[sid].encounter || []));
      });
    }
    this._playLines(lines, onDone);
  }

  // ── 다중세계: 세계 정화 → 각성 대사 → 정령 각성 연출 → 지도 복귀 ──
  _clearWorld() {
    const w = this._world;
    const already = Save.getWorldsCleared().includes(w.id);
    Save.markWorldCleared(w.id);
    if (!already && w.reward) Save.addUnlockCoins(w.reward); // 클리어 보상 코인(최초 1회) → 다른 세계 해금 재화

    if (w.isFinale) { this._finaleClear(); return; } // 무결 — 정령 각성 대신 종결 연출

    const newly = (w.spirits || []).filter((id) => !Save.isGuardianAwake(id));
    const wd = worldDialogue.worlds[w.id];
    const awakenLines = [];
    newly.forEach((id) => { if (wd && wd.spirits[id]) awakenLines.push(...(wd.spirits[id].awaken || [])); });
    newly.forEach((id) => Save.awakenGuardian(id));
    this._playLines(awakenLines, () => {
      this._worldClearCelebrate(newly, () => {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Multiverse'));
      });
    });
  }

  // 무결 피날레 — 완결의 유혹을 거절하는 종결 대사 → '쉼표' 엔딩 → 지도 복귀
  _finaleClear() {
    const wd = worldDialogue.worlds[this._world.id];
    const lines = (wd && wd.clear) || [];
    Save.setFlag('storyComplete');
    this._playLines(lines, () => {
      this._finaleCelebrate(() => {
        this.cameras.main.fadeOut(700, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Multiverse'));
      });
    });
  }

  _finaleCelebrate(onDone) {
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(46);
    c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0716, 0.9).setOrigin(0.5));
    c.add(this.add.text(0, -70, '마침표 대신,', { fontSize: '22px', color: PALETTE.inkDim, fontStyle: 'bold' }).setOrigin(0.5));
    c.add(this.add.text(0, -18, '쉼표', { fontSize: '54px', color: PALETTE.goldHex, fontStyle: 'bold' }).setOrigin(0.5));
    c.add(this.add.text(0, 46, '이야기는 다음 회차로 이어진다', { fontSize: '14px', color: PALETTE.roseHex }).setOrigin(0.5));
    const p = this.add.particles(0, -18, 'spark', {
      speed: { min: 40, max: 170 }, scale: { start: 1, end: 0 }, lifespan: 1100, frequency: 50,
      tint: [PALETTE.light, PALETTE.rose, PALETTE.gold, PALETTE.serenity], blendMode: 'ADD',
    });
    c.add(p);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 400 });
    Audio.sfx('powerup');
    this.time.delayedCall(3200, () => {
      this.tweens.add({ targets: c, alpha: 0, duration: 400, onComplete: () => { c.destroy(); onDone?.(); } });
    });
  }

  _worldClearCelebrate(spiritIds, onDone) {
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(45);
    c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0716, 0.86).setOrigin(0.5));
    c.add(this.add.text(0, -168, `${this._world.name} 정화`, { fontSize: '24px', color: PALETTE.goldHex, fontStyle: 'bold' }).setOrigin(0.5));
    if (!spiritIds.length) {
      c.add(this.add.text(0, -120, '이미 이 세계의 빛은 되찾았다', { fontSize: '15px', color: PALETTE.inkDim }).setOrigin(0.5));
    } else {
      c.add(this.add.text(0, -128, '정령 각성', { fontSize: '15px', color: PALETTE.serenityHex }).setOrigin(0.5));
      spiritIds.forEach((id, i) => {
        const px = spiritIds.length === 1 ? 0 : (i - (spiritIds.length - 1) / 2) * 130;
        const key = this.textures.exists(`pt_g_${id}`) ? `pt_g_${id}` : 'pt_g_bongi';
        const port = c.add ? this.add.image(px, -40, key).setScale(1.1) : null;
        c.add(port);
        port.setScale(0.3).setAlpha(0);
        this.tweens.add({ targets: port, scale: 1.1, alpha: 1, duration: 460, delay: 200 + i * 160, ease: 'Back.easeOut' });
        c.add(this.add.text(px, 66, GUARDIAN_NAME[id] || id, { fontSize: '20px', color: PALETTE.ink, fontStyle: 'bold' }).setOrigin(0.5));
      });
    }
    const count = 1 + Save.getAwakenedGuardians().length;
    c.add(this.add.text(0, 130, `정령 ${count} / 13`, { fontSize: '13px', color: PALETTE.inkDim }).setOrigin(0.5));
    const p = this.add.particles(0, -40, 'spark', {
      speed: { min: 40, max: 150 }, scale: { start: 1, end: 0 }, lifespan: 900, frequency: 70,
      tint: [PALETTE.light, PALETTE.rose, PALETTE.gold], blendMode: 'ADD',
    });
    c.add(p);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 300 });
    Audio.sfx('powerup');
    this.time.delayedCall(2800, () => {
      this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => { c.destroy(); onDone?.(); } });
    });
  }

  // 장착 수호자 EXP 적립 + 레벨업 피드백 (비차단)
  _awardGuardianExp(amount) {
    const lo = this._loadout;
    if (!lo) return;
    const before = levelFromExp(Save.getGuardianExp(lo.id)).level;
    Save.addGuardianExp(lo.id, amount);
    const after = levelFromExp(Save.getGuardianExp(lo.id)).level;
    const name = lo.guardian?.name || '수호자';
    const msg = after > before ? `${name}  LEVEL UP!  Lv.${after}` : `${name}  +${amount} EXP`;
    const t = this.add.text(GAME_WIDTH / 2, 130, msg, {
      fontSize: '16px', color: after > before ? PALETTE.goldHex : PALETTE.serenityHex, fontStyle: 'bold',
      backgroundColor: 'rgba(22,19,39,0.85)', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(35);
    this.tweens.add({ targets: t, y: 104, alpha: 0, duration: 1600, delay: 500, onComplete: () => t.destroy() });
  }

  // ── 에필로그 (D37) — 밤하늘·조용히 깜박이는 또 다른 빛(v3+ 떡밥) ──
  _runEpilogue() {
    // 전투 잔여물 정리 후 밤하늘로 페이드
    this.enemyBullets.children.each((b) => { if (b.active) b.deactivate(); });
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // 밤하늘 오버레이 + 멀리서 깜박이는 빛
      const sky = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0716).setOrigin(0).setDepth(50);
      const far = this.add.image(GAME_WIDTH * 0.72, GAME_HEIGHT * 0.3, 'spark')
        .setDepth(51).setTint(PALETTE.serenity).setScale(0.9).setAlpha(0.15);
      this.tweens.add({ targets: far, alpha: 0.95, scale: 1.5, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.cameras.main.fadeIn(700, 0, 0, 0);
      // 밤하늘이 보인 뒤 에필로그 대사 → 랭킹
      this.time.delayedCall(900, () => {
        this._dialogue('epilogue', () => {
          this.cameras.main.fadeOut(500, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => this._toRanking(false));
        });
      });
    });
  }

  _gameOver() {
    if (this.phase === 'over') return;
    this.phase = 'over';
    this.physics.world.pause();
    this.spawner?.destroy();
    this._showBanner('GAME OVER', '컨티뉴 없음 — 다시 도전!');
    this.cameras.main.shake(300, 0.015);
    this.time.delayedCall(1800, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this._toRanking(true));
    });
  }

  _toRanking(gameover) {
    const finalScore = this.score.finalize();
    const maxAllowed = this._maxAllowed();
    const noMiss = !this.score.missed && !gameover;
    const playStart = this.registry.get('playStartMs') || Date.now();
    const playMs = Math.max(0, Date.now() - playStart);

    // 진행도 기록 (최고 점수·노미스 클리어)
    Save.recordRun({ score: finalScore, noMiss });

    this.scene.start('Ranking', {
      score: finalScore,
      gameover,
      nickname: this.nickname,
      rawNickname: this.registry.get('nickname') || '',
      maxAllowed,
      noMiss,
      playMs,
    });
  }

  // ── 일시정지 (§11) ───────────────────────────────────────
  _togglePause() {
    if (this.paused) return this._resume();
    if (this.phase !== 'fighting' && this.phase !== 'boss') return; // 전투 중에만
    this._pause();
  }

  _pause() {
    this.paused = true;
    this.physics.world.pause();
    Audio.sfx('ui');
    const c = this.add.container(0, 0).setDepth(40);
    c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.68).setOrigin(0).setInteractive());
    c.add(this.add.text(GAME_WIDTH / 2, 250, '일시정지', { fontSize: '30px', fontStyle: 'bold', color: PALETTE.ink }).setOrigin(0.5));
    c.add(this._menuButton(GAME_WIDTH / 2, 340, '계속하기', PALETTE.rose, () => this._resume()));
    c.add(this._menuButton(GAME_WIDTH / 2, 404, this._world ? '세계 재도전' : '재시작', PALETTE.serenity, () => {
      Audio.sfx('ui');
      if (this._world) this.scene.start('Game', { worldId: this._world.id });
      else this.scene.start('Game', { stageId: 'w1' });
    }));
    c.add(this._menuButton(GAME_WIDTH / 2, 468, '타이틀로', PALETTE.panel, () => {
      Audio.sfx('ui');
      this.scene.start('Title');
    }));
    this._pauseMenu = c;
  }

  _resume() {
    this.paused = false;
    this._pauseMenu?.destroy();
    this._pauseMenu = null;
    Audio.sfx('ui');
    if (this.phase === 'fighting' || this.phase === 'boss') this.physics.world.resume();
  }

  _menuButton(x, y, label, color, cb) {
    const container = this.add.container(x, y);
    const w = 200;
    const h = 52;
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    const outline = color === PALETTE.panel;
    if (outline) {
      g.lineStyle(2, PALETTE.serenity, 0.9);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    }
    const t = this.add
      .text(0, 0, label, { fontSize: '19px', color: outline ? PALETTE.ink : '#1a1420', fontStyle: 'bold' })
      .setOrigin(0.5);
    const z = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    z.on('pointerover', () => g.setAlpha(0.85));
    z.on('pointerout', () => g.setAlpha(1));
    z.on('pointerdown', cb);
    container.add([g, t, z]);
    return container;
  }

  // 이론상 최대 점수 상한 (T7, §6) — W1+W2 누적 기준 보수적 산출
  _maxAllowed() {
    let total = 0;
    for (const id of ['w1', 'w2', 'w3', 'w4', 'final']) {
      const st = STAGES[id];
      const mobs = st.waves.reduce((n, w) => n + (w.enemies ? w.enemies.length : 0), 0);
      total += theoreticalMaxScore({ totalMobs: mobs, bossHp: st.boss.hp, tickDamage: 20 });
    }
    // 중간패턴/소환분 여유 버퍼
    return Math.floor(total * 1.5);
  }

  // ── 스폰 헬퍼 ────────────────────────────────────────────
  _spawnEnemy(type, x, y) {
    const e = this.enemies.get();
    if (e) e.spawn(type, x, y, this.stage.enemySkin);
  }

  _spawnItem(kind, x) {
    const it = this.items.get();
    if (it) it.spawn(kind, x, -20);
  }

  summonEnemy(type) {
    this._spawnEnemy(type, Phaser.Math.Between(40, GAME_WIDTH - 40), -20);
  }

  enemyFireAt(x, y, vx, vy) {
    const b = this.enemyBullets.get();
    const m = this._bulletSpdMul || 1; // 세계 난도별 탄속
    if (b) b.fire(x, y, vx * m, vy * m, 1, 'bullet_enemy');
  }

  spawnExplosion(x, y, scale = 1) {
    const p = this.add.particles(x, y, 'spark', {
      speed: { min: 40, max: 180 * scale },
      scale: { start: 1.2 * scale, end: 0 },
      lifespan: 420,
      quantity: 12,
      tint: [PALETTE.light, PALETTE.rose, PALETTE.gold],
      blendMode: 'ADD',
    });
    p.explode(14);
    this.time.delayedCall(500, () => p.destroy());
  }

  _confetti() {
    // 이미터 원점을 x=0 으로 — x 오프셋 op(0~GAME_WIDTH)이 화면 전폭에 고르게 뿌려짐
    // (원점을 중앙에 두면 0~GAME_WIDTH 가 더해져 우측으로 몰림)
    const p = this.add.particles(0, 120, 'spark', {
      x: { min: 0, max: GAME_WIDTH },
      speedY: { min: 60, max: 200 },
      speedX: { min: -40, max: 40 },
      scale: { start: 1.4, end: 0.2 },
      lifespan: 1600,
      quantity: 4,
      tint: [PALETTE.rose, PALETTE.serenity, PALETTE.gold, PALETTE.light],
    }).setDepth(29);
    this.time.delayedCall(1500, () => p.destroy());
  }

  // ── 충돌 콜백 ────────────────────────────────────────────
  _hitEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active) return;
    bullet.deactivate();
    if (enemy.takeDamage(20)) {
      this.spawnExplosion(enemy.x, enemy.y, 0.8);
      Audio.sfx('hitEnemy');
      enemy.deactivate();
      this.score.addMobKill();
      this._syncScore();
    }
  }

  _hitBoss(a, b) {
    // Phaser는 overlap(group, sprite)를 collideSpriteVsGroup(sprite, group)로 라우팅하며
    // 콜백 인자를 (boss, bullet) 순으로 넘긴다 → 인자 순서에 의존하지 않게 판별.
    const boss = a === this.boss ? a : b;
    const bullet = a === this.boss ? b : a;
    if (!bullet.active || !boss.alive) return;
    bullet.deactivate();
    this.score.addBossTick(20);
    if (boss.takeDamage(20)) {
      this._syncScore();
      this._bossDefeated();
    } else {
      this._syncScore();
    }
  }

  _hitPlayer(player, bullet) {
    if (!bullet.active) return;
    bullet.deactivate();
    this._applyPlayerHit();
  }

  _contactPlayer(player, enemy) {
    if (!enemy.active) return;
    this._applyPlayerHit();
  }

  _applyPlayerHit() {
    const now = this.time.now;
    // QA 개발자 모드 — 무제한 라이프: 피격 피드백만, 라이프·미스 무효(게임오버 없음)
    if (this._dev) {
      if (!this.player.isInvincible(now)) {
        this.player.invincibleUntil = now + PLAYER.invincibleMs;
        this.spawnExplosion(this.player.x, this.player.y, 0.6);
        Audio.sfx('playerHit');
        this.cameras.main.flash(70, 156, 193, 229);
      }
      return;
    }
    if (this.player.hit(now)) {
      this.score.markMiss();
      this.spawnExplosion(this.player.x, this.player.y, 0.9);
      Audio.sfx('playerHit');
      this._refreshLives();
      this.cameras.main.shake(180, 0.008);
      if (this.player.lives <= 0) this._gameOver();
    } else if (this.player.hasShield(now)) {
      // 실드가 막음 — 시각 피드백만
      this.cameras.main.flash(80, 156, 193, 229);
    }
  }

  _pickup(player, item) {
    if (!item.active) return;
    const kind = item.kind;
    item.deactivate();
    if (kind === 'wand') {
      this.player.powerUp();
      Audio.sfx('powerup');
    } else if (kind === 'seed') {
      this.player.addLife(1);
      this._refreshLives();
      Audio.sfx('life');
    } else if (kind === 'shield') {
      this.player.addShield(3000);
      Audio.sfx('shield');
    }
    this._floatText(item.x, item.y, kind === 'wand' ? 'POWER UP' : kind === 'seed' ? 'LIFE +1' : 'SHIELD');
  }

  _floatText(x, y, msg) {
    const t = this.add.text(x, y, msg, { fontSize: '14px', color: PALETTE.goldHex, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(25);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  _syncScore() {
    this.scoreText.setText(String(this.score.score));
  }

  // ── 프레임 루프 ──────────────────────────────────────────
  update(time, delta) {
    if (this.paused) return; // 일시정지 중 완전 정지

    // 배경 별 스크롤 (대사 중에도 잔잔히)
    const dy = (delta / 1000);
    for (const s of this.stars) {
      s.y += s.speed * dy;
      if (s.y > GAME_HEIGHT) {
        s.y = 0;
        s.x = Phaser.Math.Between(0, GAME_WIDTH);
      }
    }

    if (this.physics.world.isPaused) return;

    // 첫 월드에서 이월된 점수 적용 (한 번만)
    if (!this._carryApplied) {
      this._carryApplied = true;
      const cs = this.registry.get('carryScore');
      if (typeof cs === 'number' && this.stageId !== 'w1') {
        this.score.score += cs;
        if (this.registry.get('carryMissed')) this.score.markMiss();
        this.registry.remove('carryScore');
        this.registry.remove('carryMissed');
        this._syncScore();
      }
    }

    if (this.phase === 'over' || this.phase === 'clear') return;

    this.player.update(time, (points) => {
      for (const pt of points) {
        const b = this.playerBullets.get();
        if (b) { b.fire(pt.x, pt.y, pt.vx || 0, -520, 20, 'bullet_player'); b.setTint(this._bulletTint); }
      }
      Audio.sfx('shoot');
    });

    if (this.phase === 'boss' && this.boss && this.boss.active) {
      this.boss.update(time);
      this._drawBossHp();
      this._checkMidBark();
    }
  }

  // 보스 중간 대사 (D34 W3 총책 체력 50% 균열) — 비차단 말풍선
  _checkMidBark() {
    const mb = this.stage.boss?.midBark;
    if (!mb || this._midBarkShown) return;
    if (this.boss.hpRatio() <= (mb.at ?? 0.5)) {
      this._midBarkShown = true;
      this._bossBark(mb.speaker, mb.text);
    }
  }

  _bossBark(speaker, text) {
    const c = this.add.container(GAME_WIDTH / 2, 170).setDepth(24).setScrollFactor(0); // 보스 HUD(상단) 아래로
    const t = this.add
      .text(0, 0, text, {
        fontSize: '15px', color: PALETTE.ink, align: 'center',
        backgroundColor: 'rgba(22,19,39,0.88)', padding: { x: 12, y: 8 },
        wordWrap: { width: GAME_WIDTH - 90 },
      })
      .setOrigin(0.5);
    c.add(t);
    if (speaker) {
      c.add(this.add.text(0, -t.height / 2 - 12, speaker, { fontSize: '12px', color: PALETTE.dangerHex, fontStyle: 'bold' }).setOrigin(0.5));
    }
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 200, yoyo: true, hold: 2400, onComplete: () => c.destroy() });
    Audio.sfx('ui');
  }

  _drawBossHp() {
    const r = this.boss.hpRatio();
    const x = 40;
    const y = 74;
    const w = GAME_WIDTH - 80;
    const h = 10;
    this.bossHpBg.clear();
    this.bossHpBg.fillStyle(0x000000, 0.5);
    this.bossHpBg.fillRoundedRect(x, y, w, h, 5);
    this.bossHpBar.clear();
    this.bossHpBar.fillStyle(r > 0.3 ? PALETTE.rose : PALETTE.danger, 1);
    this.bossHpBar.fillRoundedRect(x, y, Math.max(2, w * r), h, 5);
    // HP = 대기열 숫자 감소 연출 (§3.4)
    const queue = Math.max(0, Math.floor(r * 999999)).toLocaleString('en-US');
    this.bossHpText.setText(`대기열 ${queue}`);
  }
}
