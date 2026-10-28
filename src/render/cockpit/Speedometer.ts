// Стрелочный спидометр. Шкала рисуется один раз, в кадре только поворачивается стрелка.
import Phaser from 'phaser';
import { gaugeTicks, needleAngle } from './gaugeMath';

const START_DEG = 135;
const END_DEG = 405;

export class Speedometer {
  private readonly needle: Phaser.GameObjects.Graphics;
  private readonly digits: Phaser.GameObjects.Text;
  private readonly max: number;
  private shown = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, r: number, maxKmh: number, depth: number) {
    this.max = maxKmh;
    const face = scene.add.graphics().setDepth(depth);
    face.fillStyle(0x15171b).fillCircle(x, y, r + 6);
    face.lineStyle(3, 0x8a9099).strokeCircle(x, y, r + 6);
    face.fillStyle(0x0d0f12).fillCircle(x, y, r);

    const big = maxKmh <= 200 ? 20 : 40;
    for (const v of gaugeTicks(maxKmh, big / 2)) {
      const a = needleAngle(v, maxKmh, START_DEG, END_DEG);
      const major = v % big === 0;
      const r1 = r * (major ? 0.8 : 0.87);
      face.lineStyle(major ? 3 : 2, v >= 120 && major ? 0xe0533d : 0xe8e8e8);
      face.lineBetween(x + Math.cos(a) * r1, y + Math.sin(a) * r1, x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95);
      if (major && (v / big) % 2 === 0) {
        scene.add
          .text(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, String(v), { fontFamily: 'sans-serif', fontSize: `${Math.round(r * 0.2)}px`, color: '#e8e8e8' })
          .setOrigin(0.5)
          .setDepth(depth);
      }
    }
    scene.add.text(x, y + r * 0.62, 'км/ч', { fontFamily: 'sans-serif', fontSize: `${Math.round(r * 0.15)}px`, color: '#9aa3ad' }).setOrigin(0.5).setDepth(depth);
    this.digits = scene.add
      .text(x, y + r * 0.36, '0', { fontFamily: 'monospace', fontSize: `${Math.round(r * 0.26)}px`, color: '#ffd24a' })
      .setOrigin(0.5)
      .setDepth(depth + 1);

    // Стрелка рисуется вдоль оси X и поворачивается целиком
    this.needle = scene.add.graphics({ x, y }).setDepth(depth + 1);
    this.needle.fillStyle(0xff5a36).fillTriangle(-r * 0.12, -4, r * 0.86, 0, -r * 0.12, 4);
    this.needle.fillStyle(0xcfd4da).fillCircle(0, 0, r * 0.09);
  }

  set(kmh: number): void {
    this.needle.rotation = needleAngle(kmh, this.max, START_DEG, END_DEG);
    const v = Math.round(kmh);
    if (v !== this.shown) {
      this.shown = v;
      this.digits.setText(String(v));
    }
  }
}
