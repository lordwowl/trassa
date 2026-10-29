// Зеркало заднего вида: дорога позади в той же псевдо-3D проекции, вписанная в рамку зеркала.
// Отражение: правая сторона машины — справа в зеркале. Боковые зеркала смотрят чуть наружу.
// Без аллокаций в кадре: сегменты — в предвыделенных массивах, рисование — в одну Graphics.
import Phaser from 'phaser';
import { collectBehind, createBehindSegments, type BehindSegments, type Road } from '../../core/road';
import type { TrafficCar, TrafficKind, TrafficState } from '../../core/traffic';
import { PAINTS } from '../sprites/procedural/vehicles';
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
/** Сколько машин позади рисовать в одном зеркале. */
const MAX_CARS = 16;
const GLASS = 0x2a3440;
const HEAD = 0xfff0b0;
const TAIL = 0xff3020;
const SIGNAL = 0xffa020;

/** Машины трафика для зеркал. */
export interface MirrorTraffic {
  state: TrafficState;
  kinds: readonly TrafficKind[];
  /** Сила свечения фонарей 0..1. */
  lightsOn: number;
  /** Фаза мигания поворотников. */
  blinkOn: boolean;
}

export class MirrorView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly spec: MirrorSpec;
  private readonly behind: BehindSegments = createBehindSegments(CAPACITY);
  // Машины позади за кадр: индекс и расстояние, сортировка от дальних к ближним
  private readonly carIndex = new Int32Array(MAX_CARS);
  private readonly carDist = new Float32Array(MAX_CARS);

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
    pal: RoadPalette, lit: Lighting, skyColor: number, traffic: MirrorTraffic): void {
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
    this.renderTraffic(traffic, carZ, focal, cx, horizon, camX, camY, lit);
  }

  /** Машины позади: прямоугольник кузова, стекло и фонари (попутные — спереди, обогнавшие встречные — сзади). */
  private renderTraffic(tr: MirrorTraffic, carZ: number, focal: number, cx: number, horizon: number, camX: number, camY: number,
    lit: Lighting): void {
    const b = this.behind;
    if (b.count === 0) return;
    const maxD = b.dFar[b.count - 1] as number;
    const cars = tr.state.cars;
    let n = 0;
    for (let i = 0; i < cars.length && n < MAX_CARS; i++) {
      const c = cars[i] as TrafficCar;
      if (!c.active) continue;
      const d = carZ - c.z - c.length / 2;
      if (d < NEAR_D || d >= maxD) continue;
      // Вставка по убыванию расстояния
      let j = n++;
      while (j > 0 && (this.carDist[j - 1] as number) < d) {
        this.carDist[j] = this.carDist[j - 1] as number;
        this.carIndex[j] = this.carIndex[j - 1] as number;
        j--;
      }
      this.carDist[j] = d;
      this.carIndex[j] = i;
    }
    const g = this.g;
    for (let m = 0; m < n; m++) {
      const c = cars[this.carIndex[m] as number] as TrafficCar;
      const d = this.carDist[m] as number;
      let k = 0;
      while (k < b.count - 1 && (b.dFar[k] as number) <= d) k++;
      const dn = b.dNear[k] as number;
      const t = (d - dn) / Math.max(0.01, (b.dFar[k] as number) - dn);
      const roadX = (b.xNear[k] as number) + ((b.xFar[k] as number) - (b.xNear[k] as number)) * t;
      const roadY = (b.yNear[k] as number) + ((b.yFar[k] as number) - (b.yNear[k] as number)) * t;
      const sc = focal / d;
      const kind = tr.kinds[c.kind] as TrafficKind;
      const w = kind.width * sc;
      const h = kind.height * sc;
      const x = cx + (roadX + c.x - camX) * sc;
      const y = horizon - (roadY - camY) * sc;
      g.fillStyle(shade(PAINTS[c.paint % PAINTS.length] as number, lit, d, OUTSIDE_BEAM)).fillRect(x - w / 2, y - h, w, h * 0.92);
      g.fillStyle(shade(GLASS, lit, d, OUTSIDE_BEAM)).fillRect(x - w * 0.4, y - h * 0.9, w * 0.8, h * 0.35);
      const facing = c.dir > 0;
      const lw = Math.max(1, w * 0.18);
      const lh = Math.max(1, h * 0.1);
      const ly = y - h * 0.32;
      const color = facing ? HEAD : TAIL;
      g.fillStyle(tr.lightsOn > 0.3 ? color : shade(color, lit, d, OUTSIDE_BEAM));
      g.fillRect(x - w / 2, ly, lw, lh).fillRect(x + w / 2 - lw, ly, lw, lh);
      // Поворотник: в зеркале сторона мира сохраняется — левый у попутной слева
      if (c.signal !== 0 && tr.blinkOn) {
        g.fillStyle(SIGNAL);
        const sx = c.signal * c.dir < 0 ? x - w / 2 : x + w / 2 - lw;
        g.fillRect(sx, ly - lh * 1.2, lw, lh);
      }
    }
  }
}

function quad(g: Phaser.GameObjects.Graphics, x1: number, y1: number, w1: number, x2: number, y2: number, w2: number): void {
  g.fillTriangle(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2);
  g.fillTriangle(x1 - w1, y1, x2 + w2, y2, x2 - w2, y2);
}
