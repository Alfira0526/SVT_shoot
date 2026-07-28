import Phaser from 'phaser';

// 탄환 — 플레이어탄(위로)·적탄(아무 방향). 풀링으로 재사용.
export class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture) {
    super(scene, x, y, texture);
    this.damage = 0;
  }

  fire(x, y, vx, vy, damage, texture) {
    if (texture && texture !== this.texture.key) this.setTexture(texture);
    this.enableBody(true, x, y, true, true);
    this.setActive(true).setVisible(true);
    this.setVelocity(vx, vy);
    this.damage = damage;
    return this;
  }

  deactivate() {
    this.disableBody(true, true);
    this.setVelocity(0, 0);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    // 화면 밖으로 나가면 회수
    const b = this.scene.scale.height;
    if (this.y < -40 || this.y > b + 40 || this.x < -40 || this.x > this.scene.scale.width + 40) {
      this.deactivate();
    }
  }
}

// 탄환 그룹 팩토리 — 씬에서 player/enemy 각각 생성해 사용.
export function createBulletGroup(scene, defaultTexture, max = 256) {
  return scene.physics.add.group({
    classType: Bullet,
    maxSize: max,
    runChildUpdate: true,
    createCallback: (b) => b.setTexture(defaultTexture),
  });
}
