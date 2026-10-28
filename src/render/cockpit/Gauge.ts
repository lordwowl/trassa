// Стрелочный прибор (спидометр, тахометр). Шкала рисуется один раз,
// в кадре поворачивается только стрелка, текст в центре обновляется при изменении.
import Phaser from 'phaser';
import { gaugeTicks, needleAngle } from './gaugeMath';

const START_DEG = 135;
const END_DEG = 405;

export interface GaugeOptions {
  max: number;
  /** Шаг крупных делений (мелкие — вдвое чаще). */
  majorStep: number;
  /** Подписывать каждое n-е крупное деление. */
  labelEvery: number;
  /** Делитель для подписей (тахометр: 1000 → «3» вместо «3000»). */
  labelDivisor: number;
  /** С какого значения деления красные. */
  redFrom: number;
  unit: string;
}

export class Gauge {
  private readonly needle: Phaser.GameObjects.Graphics;
  private readonly center: Phaser.GameObjects.Text;
  private readonly max: number;
  private shownText = '';

  constructor(scene: Phaser.Scene, x: number, y: number, r: number, o: GaugeOptions, depth: number) {
    this.max = o.max;
    const face = scene.add.graphics().setDepth(depth);
    face.fillStyle(0x15171b).fillCircle(x, y, r + 6);
    face.lineStyle(3, 0x8a9099).strokeCircle(x, y, r + 6);
    face.fillStyle(0x0d0f12).fillCircle(x, y, r);

    const font = { fontFamily: 'sans-serif', color: '#e8e8e8' };
    gaugeTicks(o.max, o.majorStep / 2).forEach((v, i) => {
      const a = needleAngle(v, o.max, START_DEG, END_DEG);
      const major = i % 2 === 0;
      const r1 = r * (major ? 0.8 : 0.87);
      face.lineStyle(major ? 3 : 2, v >= o.redFrom ? 0xe0533d : 0xe8e8e8);
      face.lineBetween(x + Math.cos(a) * r1, y + Math.sin(a) * r1, x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95);
      if (major && (i / 2) % o.labelEvery === 0) {
        scene.add
          .text(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, String(Math.round(v / o.labelDivisor)), { ...font, fontSize: `${Math.round(r * 0.2)}px` })
          .setOrigin(0.5)
          .setDepth(depth);
      }
    });
    scene.add.text(x, y + r * 0.62, o.unit, { fontFamily: 'sans-serif', fontSize: `${Math.round(r * 0.15)}px`, color: '#9aa3ad' }).setOrigin(0.5).setDepth(depth);
    this.center = scene.add
      .text(x, y + r * 0.36, '', { fontFamily: 'monospace', fontSize: `${Math.round(r * 0.26)}px`, color: '#ffd24a' })
      .setOrigin(0.5)
      .setDepth(depth + 1);

    // Стрелка рисуется вдоль оси X и поворачивается целиком
    this.needle = scene.add.graphics({ x, y }).setDepth(depth + 1);
    this.needle.fillStyle(0xff5a36).fillTriangle(-r * 0.12, -4, r * 0.86, 0, -r * 0.12, 4);
    this.needle.fillStyle(0xcfd4da).fillCircle(0, 0, r * 0.09);
  }

  setValue(v: number): void {
    this.needle.rotation = needleAngle(v, this.max, START_DEG, END_DEG);
  }

  /** Текст в центре; перерисовывается только при изменении (строку передавать из кэша). */
  setText(text: string): void {
    if (text !== this.shownText) {
      this.shownText = text;
      this.center.setText(text);
    }
  }
}
