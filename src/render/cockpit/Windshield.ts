// Слой лобового стекла: струи дождя в воздухе, капли на стекле, дворники и лёгкая мутность.
// Между придорожными спрайтами (1–2) и кабиной (40). Без аллокаций в кадре.
import Phaser from 'phaser';
import { dropCoverage, type Windshield, type WindshieldParams } from '../../core/world';

const DEPTH = 35;
/** Струй дождя на полную интенсивность. */
const MAX_STREAKS = 70;

export class WindshieldLayer {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly arms: Phaser.GameObjects.Graphics[] = [];

  constructor(scene: Phaser.Scene, p: WindshieldParams) {
    this.g = scene.add.graphics().setDepth(DEPTH);
    for (const w of p.wipers) {
      // Щётка нарисована вдоль оси «влево» от оси вращения и поворачивается целиком
      const arm = scene.add.graphics({ x: w.px, y: w.py }).setDepth(DEPTH + 1);
      arm.lineStyle(6, 0x15161a).lineBetween(0, 0, -w.length * 0.92, 0);
      arm.lineStyle(10, 0x0c0d10).lineBetween(-w.rInner, -3, -w.length, -3);
      arm.fillStyle(0x2a2c31).fillCircle(0, 0, 10);
      this.arms.push(arm);
    }
  }

  render(w: Windshield, p: WindshieldParams, rain: number, speed: number, time: number): void {
    const g = this.g;
    g.clear();

    // Струи дождя: детерминированные по времени, наклон растёт со скоростью
    const n = Math.round(MAX_STREAKS * rain);
    if (n > 0) {
      const slant = 0.25 + Math.min(1.5, speed / 25);
      g.lineStyle(2, 0xc8d4e0, 0.35);
      for (let i = 0; i < n; i++) {
        const fall = 900 + (i % 7) * 60;
        const y = (i * 137.5 + time * fall * 0.001) % (p.height + 60) - 40;
        const x = (i * 211.7 + y * slant * 0.3) % p.width;
        g.lineBetween(x, y, x - 10 * slant, y - 28);
      }
    }

    // Мутность от капель
    const cover = dropCoverage(w, p);
    if (cover > 0.01) {
      g.fillStyle(0xdfe6ee, cover * 0.18);
      g.fillRect(0, 0, p.width, p.height);
    }

    // Капли: полупрозрачное тело и блик
    for (let i = 0; i < w.count; i++) {
      const x = w.x[i] as number;
      const y = w.y[i] as number;
      const r = w.r[i] as number;
      g.fillStyle(0xd6e2ee, 0.32);
      g.fillCircle(x, y, r);
      g.fillStyle(0xffffff, 0.55);
      g.fillCircle(x - r * 0.35, y - r * 0.35, r * 0.3);
    }

    for (let k = 0; k < this.arms.length; k++) (this.arms[k] as Phaser.GameObjects.Graphics).rotation = w.angle;
  }
}
