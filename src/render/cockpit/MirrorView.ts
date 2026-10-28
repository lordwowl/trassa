// Зеркало заднего вида: дорога позади в той же псевдо-3D проекции, вписанная в рамку зеркала.
// Отражение: правая сторона машины — справа в зеркале. Боковые зеркала смотрят чуть наружу.
// Без аллокаций в кадре: сегменты — в предвыделенных массивах, рисование — в одну Graphics.
import Phaser from 'phaser';
import { collectBehind, createBehindSegments, type BehindSegments, type Road } from '../../core/road';
import { shade, type Lighting } from '../road/lighting';
import type { RoadPalette } from '../road/RoadRenderer';

export interface MirrorSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Смещение точки обзора от оси машины, м (левое зеркало < 0). */
  offsetX: number;
  /** Поворот наружу: сдвиг картинки, доля фокусного (левое > 0 — видно больше слева). */
  yaw: number;
  /** Горизонт, доля высоты зеркала. */
  horizon: number;
}

const OUTSIDE_BEAM = 1e6;
const CAPACITY = 120;
const NEAR_D = 1;

export class MirrorView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly spec: MirrorSpec;
  private readonly behind: BehindSegments = createBehindSegments(CAPACITY);

  constructor(scene: Phaser.Scene, spec: MirrorSpec, depth: number) {
    this.spec = spec;
    this.g = scene.add.graphics().setDepth(depth);
    const shape = scene.make.graphics({}, false);
    shape.fillStyle(0xffffff).fillRoundedRect(spec.x, spec.y, spec.w, spec.h, 10);
    this.g.setMask(shape.createGeometryMask());
    // Рамка поверх изображения
    const frame = scene.add.graphics().setDepth(depth + 1);
    frame.lineStyle(6, 0x101114).strokeRoundedRect(spec.x - 3, spec.y - 3, spec.w + 6, spec.h + 6, 12);
    frame.lineStyle(2, 0x4a4f58).strokeRoundedRect(spec.x - 6, spec.y - 6, spec.w + 12, spec.h + 12, 14);
  }

  /**
   * carX — смещение машины от оси дороги (м), segments — дальность в сегментах.
   */
  render(road: Road, carZ: number, carX: number, cameraHeight: number, laneWidth: number, segments: number,
    pal: RoadPalette, lit: Lighting, skyColor: number): void {
    const s = this.spec;
    const g = this.g;
    g.clear();
    const focal = s.w * 0.75;
    const cx = s.x + s.w / 2 + focal * s.yaw;
    const horizon = s.y + s.h * s.horizon;
    const camX = carX + s.offsetX;

    g.fillStyle(skyColor).fillRect(s.x, s.y, s.w, s.h);
    g.fillStyle(shade(pal.grassDark, lit, 1000, OUTSIDE_BEAM)).fillRect(s.x, horizon, s.w, s.y + s.h - horizon);

    const b = collectBehind(this.behind, road, carZ, segments);
    const camY = (b.yNear[0] as number) + cameraHeight;
    // Рисуем от дальних к ближним
    for (let k = b.count - 1; k >= 0; k--) {
      const d1 = Math.max(NEAR_D, b.dNear[k] as number);
      const d2 = b.dFar[k] as number;
      if (d2 <= d1) continue;
      const sc1 = focal / d1;
      const sc2 = focal / d2;
      const y1 = horizon - ((b.yNear[k] as number) - camY) * sc1;
      const y2 = horizon - ((b.yFar[k] as number) - camY) * sc2;
      if (y2 >= y1) continue;
      const x1 = cx + ((b.xNear[k] as number) - camX) * sc1;
      const x2 = cx + ((b.xFar[k] as number) - camX) * sc2;
      const half = ((b.lanes[k] as number) * laneWidth) / 2;
      const light = Math.floor((b.segment[k] as number) / 3) % 2 === 0;
      g.fillStyle(shade(light ? pal.grassLight : pal.grassDark, lit, d1, OUTSIDE_BEAM));
      g.fillRect(s.x, y2, s.w, y1 - y2);
      g.fillStyle(shade(light ? pal.rumbleLight : pal.rumbleDark, lit, d1, OUTSIDE_BEAM));
      quad(g, x1, y1, (half + 0.6) * sc1, x2, y2, (half + 0.6) * sc2);
      g.fillStyle(shade(light ? pal.roadLight : pal.roadDark, lit, d1, OUTSIDE_BEAM));
      quad(g, x1, y1, half * sc1, x2, y2, half * sc2);
      if (light) {
        g.fillStyle(shade(pal.lane, lit, d1, OUTSIDE_BEAM));
        quad(g, x1, y1, 0.08 * sc1, x2, y2, 0.08 * sc2);
      }
    }
  }
}

function quad(g: Phaser.GameObjects.Graphics, x1: number, y1: number, w1: number, x2: number, y2: number, w2: number): void {
  g.fillTriangle(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2);
  g.fillTriangle(x1 - w1, y1, x2 + w2, y2, x2 - w2, y2);
}
