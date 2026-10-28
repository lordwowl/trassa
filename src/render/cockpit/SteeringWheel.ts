// Руль: обод, три спицы, ступица и метка «12 часов». Рисуется один раз, в кадре только поворот.
import Phaser from 'phaser';

export class SteeringWheel {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, r: number, depth: number) {
    const g = scene.add.graphics({ x, y }).setDepth(depth);
    const rim = r * 0.13;
    g.lineStyle(rim, 0x34373e).strokeCircle(0, 0, r);
    g.lineStyle(3, 0x5c626c).strokeCircle(0, 0, r + rim / 2 - 2);
    // Спицы: влево, вправо и вниз
    g.lineStyle(r * 0.1, 0x2c2f35);
    g.lineBetween(-r, 0, r, 0);
    g.lineBetween(0, 0, 0, r);
    g.fillStyle(0x2c3036).fillCircle(0, 0, r * 0.28);
    g.fillStyle(0x3b4048).fillCircle(0, 0, r * 0.16);
    // Метка верха руля — видно, насколько он повёрнут
    g.fillStyle(0xe0a93c).fillRect(-r * 0.05, -r - rim / 2, r * 0.1, rim);
    this.g = g;
  }

  /** Угол поворота, градусы (вправо > 0). */
  setAngle(deg: number): void {
    this.g.rotation = (deg * Math.PI) / 180;
  }
}
