// Небо: вертикальный градиент от зенита к горизонту. Перерисовывается только когда меняется цвет
// (время суток идёт медленно) или линия горизонта.
import Phaser from 'phaser';
import { skyColors, type Lighting, type SkyColors } from './lighting';

export class Sky {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly colors: SkyColors = { top: 0, bottom: 0 };
  private drawnTop = -1;
  private drawnBottom = -1;
  private drawnHorizon = -1;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(-1);
  }

  /** Цвет у горизонта — для зеркал. */
  get horizonColor(): number {
    return this.colors.bottom;
  }

  update(hour: number, horizonY: number, width: number, light: Lighting, overcast: number): void {
    const c = skyColors(this.colors, hour, light, overcast);
    if (c.top === this.drawnTop && c.bottom === this.drawnBottom && horizonY === this.drawnHorizon) return;
    this.drawnTop = c.top;
    this.drawnBottom = c.bottom;
    this.drawnHorizon = horizonY;
    const g = this.g;
    g.clear();
    // Ниже горизонта небо закроет земля; запас на холмы, уходящие под горизонт
    g.fillGradientStyle(c.top, c.top, c.bottom, c.bottom, 1);
    g.fillRect(0, 0, width, horizonY + 2);
    g.fillStyle(c.bottom).fillRect(0, horizonY + 2, width, 400);
  }
}
