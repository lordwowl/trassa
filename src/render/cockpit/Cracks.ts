// Трещины на лобовом стекле: каждая — звезда из лучей с ответвлениями от точки удара.
// Рисуются один раз при ударе в общую Graphics (не очищается), в кадре ничего не делается.
import Phaser from 'phaser';
import { next, range, type RngState } from '../../core/rng';

const DEPTH = 36;
/** Больше трещин не рисуем — стекло и так всё в трещинах. */
const MAX_CRACKS = 14;

export class Cracks {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly rng: RngState;
  private count = 0;

  constructor(scene: Phaser.Scene, rng: RngState) {
    this.g = scene.add.graphics().setDepth(DEPTH);
    this.rng = rng;
  }

  /** Трещина в точке (x, y), size — длина лучей, px. */
  add(x: number, y: number, size: number): void {
    if (this.count >= MAX_CRACKS) return;
    this.count++;
    const g = this.g;
    const rng = this.rng;
    // Матовое пятно в центре удара
    g.fillStyle(0xe8eef4, 0.35).fillCircle(x, y, size * 0.08);
    const rays = 5 + Math.floor(next(rng) * 5);
    for (let i = 0; i < rays; i++) {
      let a = (i / rays) * Math.PI * 2 + range(rng, -0.3, 0.3);
      let px = x;
      let py = y;
      const len = size * range(rng, 0.5, 1);
      const steps = 4;
      for (let s = 0; s < steps; s++) {
        a += range(rng, -0.35, 0.35);
        const l = len / steps;
        const nx = px + Math.cos(a) * l;
        const ny = py + Math.sin(a) * l;
        // Тёмная линия с белым бликом рядом — видно и на небе, и на асфальте
        g.lineStyle(2, 0x20262c, 0.55).lineBetween(px, py, nx, ny);
        g.lineStyle(1, 0xffffff, 0.8).lineBetween(px + 1, py, nx + 1, ny);
        // Ответвление
        if (next(rng) < 0.45) {
          const b = a + range(rng, 0.5, 1.1) * (next(rng) < 0.5 ? -1 : 1);
          const bl = l * range(rng, 0.4, 0.9);
          g.lineStyle(1, 0xffffff, 0.7).lineBetween(nx, ny, nx + Math.cos(b) * bl, ny + Math.sin(b) * bl);
        }
        px = nx;
        py = ny;
      }
    }
    // Дуги вокруг центра — характерная «паутина»
    g.lineStyle(1, 0xffffff, 0.55);
    for (let r = size * 0.2; r < size * 0.6; r += size * 0.2) {
      const start = next(rng) * Math.PI * 2;
      g.beginPath();
      g.arc(x, y, r, start, start + range(rng, 0.8, 2.2));
      g.strokePath();
    }
  }

  get crackCount(): number {
    return this.count;
  }
}
