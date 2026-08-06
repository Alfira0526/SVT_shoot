import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../config/constants.js';
import { Save } from '../systems/SaveSystem.js';
import { Audio } from '../systems/Audio.js';
import { levelFromExp, stageFromLevel, STAGE_NAME, MAX_LEVEL } from '../config/leveling.js';
import { guardianColorHex } from '../systems/Loadout.js';
import guardians from '../config/guardians.json';

// 수호자 도감 (13인 각성 컬렉션) — 각성한 빛은 초상화·이름·빛, 잠든 빛은 실루엣.
// 스토리 모드에서 각 스테이지 클리어로 한 명씩 각성 → 여기 채워진다.
export class GuardianScene extends Phaser.Scene {
  constructor() {
    super('Guardian');
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.deep).setOrigin(0);
    for (let i = 0; i < 40; i++) {
      this.add.image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT), 'star')
        .setScale(Phaser.Math.Between(1, 2)).setAlpha(Phaser.Math.FloatBetween(0.15, 0.5))
        .setTint(i % 2 ? PALETTE.rose : PALETTE.serenity);
    }

    const awake = Save.getAwakenedGuardians();
    const isAwake = (g) => g.awake || awake.includes(g.id);
    const count = guardians.roster.filter(isAwake).length;

    this.add.text(GAME_WIDTH / 2, 40, '수호자 도감', { fontSize: '30px', fontStyle: 'bold', color: PALETTE.ink }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 74, `흩어진 빛을 되찾는 중  ·  ${count} / 13`, { fontSize: '14px', color: PALETTE.goldHex }).setOrigin(0.5);

    // 3열 × 5행 그리드
    const cols = 3;
    const x0 = 88, dx = (GAME_WIDTH - x0 * 2) / (cols - 1);
    const y0 = 148, dy = 118;
    guardians.roster.slice(0, 13).forEach((g, i) => {
      const cx = x0 + (i % cols) * dx;
      const cy = y0 + Math.floor(i / cols) * dy;
      this._slot(cx, cy, g, isAwake(g));
    });

    this._backButton();
  }

  _slot(cx, cy, g, awake) {
    const w = 118, h = 104;
    const equipped = awake && Save.getEquipped() === g.id;
    const panel = this.add.graphics();
    panel.fillStyle(awake ? PALETTE.panel : 0x110f1e, 1);
    panel.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 12);
    panel.lineStyle(equipped ? 3 : 2, equipped ? PALETTE.gold : awake ? PALETTE.serenity : 0x2a2540, equipped ? 1 : 0.9);
    panel.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 12);

    if (awake) {
      const { level } = levelFromExp(Save.getGuardianExp(g.id));
      const stage = stageFromLevel(level);
      // 진화 오라 (단계별) — 초상화 뒤
      if (stage >= 2) {
        const aura = this.add.graphics();
        aura.fillStyle(stage >= 3 ? PALETTE.gold : guardianColorHex(g), stage >= 3 ? 0.28 : 0.18);
        aura.fillCircle(cx, cy - 14, stage >= 3 ? 30 : 26);
      }
      const key = this.textures.exists(g.portrait) ? g.portrait : 'pt_bongi';
      this.add.image(cx, cy - 14, key).setScale(0.52);
      // Lv 배지
      this.add.text(cx - w / 2 + 8, cy - h / 2 + 6, `Lv.${level}`, { fontSize: '11px', color: PALETTE.goldHex, fontStyle: 'bold' });
      if (equipped) this.add.text(cx + w / 2 - 8, cy - h / 2 + 6, '장착', { fontSize: '10px', color: PALETTE.gold ? PALETTE.goldHex : '#fff', fontStyle: 'bold' }).setOrigin(1, 0);
      this.add.text(cx, cy + 28, g.name, { fontSize: '15px', color: PALETTE.ink, fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(cx, cy + 44, `${g.light} · ${STAGE_NAME[stage]}`, { fontSize: '9px', color: PALETTE.roseHex }).setOrigin(0.5);
      this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { Audio.sfx('ui'); this._detail(g); });
    } else {
      // 잠든 빛 — 실루엣 + 물음표
      this.add.text(cx, cy - 12, '?', { fontSize: '40px', color: '#3a3358', fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(cx, cy + 34, g.light || '잠든 빛', { fontSize: '11px', color: PALETTE.inkDim }).setOrigin(0.5);
    }
  }

  _detail(g) {
    if (this._overlay) return;
    const c = this.add.container(0, 0).setDepth(30);
    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.74).setOrigin(0)
      .setInteractive().on('pointerdown', () => { c.destroy(); this._overlay = null; });
    c.add(dim);
    const key = this.textures.exists(g.portrait) ? g.portrait : 'pt_bongi';
    const st = levelFromExp(Save.getGuardianExp(g.id));
    const stage = stageFromLevel(st.level);
    // 진화 오라
    if (stage >= 2) {
      const aura = this.add.graphics();
      aura.fillStyle(stage >= 3 ? PALETTE.gold : guardianColorHex(g), stage >= 3 ? 0.3 : 0.2);
      aura.fillCircle(GAME_WIDTH / 2, 230, stage >= 3 ? 92 : 80);
      c.add(aura);
    }
    c.add(this.add.image(GAME_WIDTH / 2, 230, key).setScale(1.5));
    c.add(this.add.text(GAME_WIDTH / 2, 330, g.name, { fontSize: '30px', color: PALETTE.ink, fontStyle: 'bold' }).setOrigin(0.5));
    c.add(this.add.text(GAME_WIDTH / 2, 364, `${g.light}  ·  Lv.${st.level} ${STAGE_NAME[stage]}`, { fontSize: '15px', color: PALETTE.roseHex, fontStyle: 'bold' }).setOrigin(0.5));

    // EXP 바
    const bw = 220, bx = GAME_WIDTH / 2 - bw / 2, by = 392;
    const bar = this.add.graphics();
    bar.fillStyle(0x000000, 0.5); bar.fillRoundedRect(bx, by, bw, 10, 5);
    const ratio = st.max ? 1 : (st.need ? st.into / st.need : 0);
    bar.fillStyle(PALETTE.gold, 1); bar.fillRoundedRect(bx, by, Math.max(3, bw * ratio), 10, 5);
    c.add(bar);
    c.add(this.add.text(GAME_WIDTH / 2, 410, st.max ? 'MAX' : `EXP ${st.into} / ${st.need}`, { fontSize: '11px', color: PALETTE.inkDim }).setOrigin(0.5));

    if (g.personality) {
      c.add(this.add.text(GAME_WIDTH / 2, 452, g.personality, {
        fontSize: '14px', color: PALETTE.inkDim, align: 'center', wordWrap: { width: GAME_WIDTH - 100 }, lineSpacing: 5,
      }).setOrigin(0.5));
    }
    if (g.shadow) {
      c.add(this.add.text(GAME_WIDTH / 2, 508, `흐린 그림자 · ${g.shadow}`, { fontSize: '13px', color: PALETTE.dangerHex }).setOrigin(0.5));
    }

    // 장착 버튼
    const equipped = Save.getEquipped() === g.id;
    const by2 = 556, bw2 = 200, bh2 = 48;
    const eg = this.add.graphics();
    eg.fillStyle(equipped ? PALETTE.panel : PALETTE.gold, 1);
    eg.fillRoundedRect(GAME_WIDTH / 2 - bw2 / 2, by2 - bh2 / 2, bw2, bh2, 12);
    if (equipped) { eg.lineStyle(2, PALETTE.gold, 0.9); eg.strokeRoundedRect(GAME_WIDTH / 2 - bw2 / 2, by2 - bh2 / 2, bw2, bh2, 12); }
    c.add(eg);
    c.add(this.add.text(GAME_WIDTH / 2, by2, equipped ? '장착됨' : '이 수호자로 장착', { fontSize: '17px', color: equipped ? PALETTE.goldHex : '#2a1a12', fontStyle: 'bold' }).setOrigin(0.5));
    if (!equipped) {
      c.add(this.add.zone(GAME_WIDTH / 2, by2, bw2, bh2).setInteractive({ useHandCursor: true })
        .on('pointerdown', (p, lx, ly, ev) => { ev?.stopPropagation?.(); Audio.sfx('powerup'); Save.setEquipped(g.id); this.scene.restart(); }));
    }
    c.add(this.add.text(GAME_WIDTH / 2, 606, '빈 곳을 탭하면 닫기', { fontSize: '12px', color: PALETTE.serenityHex }).setOrigin(0.5));
    this._overlay = c;
  }

  _backButton() {
    const y = GAME_HEIGHT - 52;
    const w = 200, h = 52;
    const g = this.add.graphics();
    g.fillStyle(PALETTE.panel, 1);
    g.fillRoundedRect(GAME_WIDTH / 2 - w / 2, y - h / 2, w, h, 14);
    g.lineStyle(2, PALETTE.serenity, 0.9);
    g.strokeRoundedRect(GAME_WIDTH / 2 - w / 2, y - h / 2, w, h, 14);
    this.add.text(GAME_WIDTH / 2, y, '타이틀로', { fontSize: '19px', color: PALETTE.ink, fontStyle: 'bold' }).setOrigin(0.5);
    this.add.zone(GAME_WIDTH / 2, y, w, h).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { Audio.sfx('ui'); this.scene.start('Title'); });
  }
}
