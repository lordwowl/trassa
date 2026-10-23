// Псевдо-3D отрисовка дороги (подход Javascript Racer).
// Проход вперёд: проекция сегментов в предвыделенные массивы и отсечение скрытых.
// Проход назад: рисование от дальних к ближним (ближние перекрывают дальние на холмах).
// В кадре нет аллокаций: только числовые массивы, созданные в конструкторе.
import Phaser from 'phaser';
import { heightAt, project, type ProjectionView, type Projected, type Road, type RoadSegment } from '../../core/road';

export interface RoadPalette {
  sky: number;
  grassLight: number;
  grassDark: number;
  roadLight: number;
  roadDark: number;
  rumbleLight: number;
  rumbleDark: number;
  lane: number;
}

export const DAY_PALETTE: RoadPalette = {
  sky: 0x5fb4f0,
  grassLight: 0x5cae3a,
  grassDark: 0x4e9e30,
  roadLight: 0x6a6f74,
  roadDark: 0x64696e,
  rumbleLight: 0xf2f2f2,
  rumbleDark: 0xc0392b,
  lane: 0xf2f2f2,
};

export const NIGHT_PALETTE: RoadPalette = {
  sky: 0x0b1530,
  grassLight: 0x1f3a1c,
  grassDark: 0x1a3318,
  roadLight: 0x2c2f33,
  roadDark: 0x282b2f,
  rumbleLight: 0x8a8a8a,
  rumbleDark: 0x5a1f1a,
  lane: 0x9a9a9a,
};

export interface RoadView {
  /** Позиция камеры вдоль трассы, м. */
  z: number;
  /** Смещение камеры от центра дороги, м (вправо > 0). */
  x: number;
  /** Высота глаз над дорогой, м. */
  cameraHeight: number;
  /** Сколько сегментов рисовать. */
  drawDistance: number;
  laneWidth: number;
  view: ProjectionView;
  width: number;
  height: number;
}

/** Ширина «зебры» на обочине, м. */
const RUMBLE_WIDTH = 0.6;
/** Ширина линии разметки, м. */
const LANE_LINE_WIDTH = 0.12;
/** Чередование цветов каждые N сегментов. */
const STRIPE_LENGTH = 3;
/** Ближняя плоскость отсечения, м. */
const NEAR_Z = 0.3;
/** Сегменты тоньше этого (px) у горизонта не рисуются по отдельности. */
const MIN_SEGMENT_PX = 1;

export class RoadRenderer {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly cap: number;
  // Спроецированные сегменты: ближний (1) и дальний (2) край
  private readonly x1: Float32Array;
  private readonly y1: Float32Array;
  private readonly w1: Float32Array;
  private readonly x2: Float32Array;
  private readonly y2: Float32Array;
  private readonly w2: Float32Array;
  /** Нижняя граница полосы травы: дальний край предыдущего нарисованного сегмента (без щелей). */
  private readonly gb: Float32Array;
  private readonly seg: Int32Array;
  private readonly lanes: Int32Array;
  private readonly p: Projected = { x: 0, y: 0, scale: 0 };

  constructor(scene: Phaser.Scene, maxDrawDistance: number) {
    this.g = scene.add.graphics();
    this.cap = maxDrawDistance;
    this.x1 = new Float32Array(maxDrawDistance);
    this.y1 = new Float32Array(maxDrawDistance);
    this.w1 = new Float32Array(maxDrawDistance);
    this.x2 = new Float32Array(maxDrawDistance);
    this.y2 = new Float32Array(maxDrawDistance);
    this.w2 = new Float32Array(maxDrawDistance);
    this.gb = new Float32Array(maxDrawDistance);
    this.seg = new Int32Array(maxDrawDistance);
    this.lanes = new Int32Array(maxDrawDistance);
  }

  get graphics(): Phaser.GameObjects.Graphics {
    return this.g;
  }

  render(road: Road, v: RoadView, pal: RoadPalette): void {
    const g = this.g;
    g.clear();
    const segs = road.segments;
    const n = segs.length;
    const L = road.segmentLength;
    const L2 = L * L;
    const draw = Math.min(this.cap, v.drawDistance, n);

    // Земля до горизонта: закрывает просвет между дальним краем дороги и горизонтом
    const horizon = v.view.horizonY;
    g.fillStyle(pal.grassDark);
    g.fillRect(0, horizon, v.width, v.height - horizon);

    const zWrapped = ((v.z % road.length) + road.length) % road.length;
    const base = Math.floor(zWrapped / L);
    const offset = zWrapped - base * L;
    const camY = heightAt(road, zWrapped) + v.cameraHeight;

    // Боковое смещение центра дороги: x — положение, dx — приращение за сегмент
    const baseSeg = segs[base % n] as RoadSegment;
    let x = 0;
    let dx = -baseSeg.curve * L2 * (offset / L);
    let top = v.height; // самая верхняя уже закрытая точка экрана
    let count = 0;

    for (let i = 0; i < draw; i++) {
      const idx = (base + i) % n;
      const s = segs[idx] as RoadSegment;
      const sNext = segs[(idx + 1) % n] as RoadSegment;
      let za = i * L - offset;
      const zb = za + L;
      let xa = x;
      let ya = s.y;
      const xb = x + dx;
      const yb = sNext.y;
      x += dx;
      dx += s.curve * L2;
      if (zb <= NEAR_Z) continue;
      if (za < NEAR_Z) {
        // Подрезаем сегмент по ближней плоскости
        const f = (NEAR_Z - za) / L;
        xa += (xb - xa) * f;
        ya += (yb - ya) * f;
        za = NEAR_Z;
      }
      const halfW = (s.lanes * v.laneWidth) / 2;
      const p = this.p;
      project(p, v.view, xa - v.x, ya - camY, za);
      const sx1 = p.x;
      const sy1 = p.y;
      const sw1 = halfW * p.scale;
      project(p, v.view, xb - v.x, yb - camY, zb);
      const sy2 = p.y;
      // Дальний край ниже ближнего (обратная сторона холма) или целиком за уже нарисованным — пропуск
      if (sy2 >= sy1 || sy2 > top - MIN_SEGMENT_PX) continue;
      this.gb[count] = Math.max(sy1, top);
      top = sy2;
      this.x1[count] = sx1;
      this.y1[count] = sy1;
      this.w1[count] = sw1;
      this.x2[count] = p.x;
      this.y2[count] = sy2;
      this.w2[count] = halfW * p.scale;
      this.seg[count] = base + i;
      this.lanes[count] = s.lanes;
      count++;
    }

    const rumbleK = RUMBLE_WIDTH / (v.laneWidth / 2);
    for (let k = count - 1; k >= 0; k--) {
      const x1 = this.x1[k] as number;
      const y1 = this.y1[k] as number;
      const w1 = this.w1[k] as number;
      const x2 = this.x2[k] as number;
      const y2 = this.y2[k] as number;
      const w2 = this.w2[k] as number;
      const lanes = this.lanes[k] as number;
      const light = Math.floor((this.seg[k] as number) / STRIPE_LENGTH) % 2 === 0;
      // Без округления: иначе полоса травы на пиксель залезает на дальний асфальт
      const gb = this.gb[k] as number;
      g.fillStyle(light ? pal.grassLight : pal.grassDark);
      g.fillRect(0, y2, v.width, gb - y2);

      // Обочина-«зебра»: шире полотна на RUMBLE_WIDTH с каждой стороны
      const r1 = w1 * (1 + rumbleK / lanes);
      const r2 = w2 * (1 + rumbleK / lanes);
      g.fillStyle(light ? pal.rumbleLight : pal.rumbleDark);
      quad(g, x1, y1, r1, x2, y2, r2);

      g.fillStyle(light ? pal.roadLight : pal.roadDark);
      quad(g, x1, y1, w1, x2, y2, w2);

      // Разметка между полосами — пунктир
      if (light && lanes > 1) {
        // w — полуширина полотна в px; полуширина линии = w · (LANE_LINE_WIDTH / 2) / halfW
        const lw1 = (w1 * LANE_LINE_WIDTH) / (lanes * v.laneWidth);
        const lw2 = (w2 * LANE_LINE_WIDTH) / (lanes * v.laneWidth);
        g.fillStyle(pal.lane);
        for (let lane = 1; lane < lanes; lane++) {
          const f = (2 * lane) / lanes - 1;
          quad(g, x1 + w1 * f, y1, lw1, x2 + w2 * f, y2, lw2);
        }
      }
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

/** Трапеция с центрами x1/x2 и полуширинами w1/w2. */
function quad(g: Phaser.GameObjects.Graphics, x1: number, y1: number, w1: number, x2: number, y2: number, w2: number): void {
  g.fillTriangle(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2);
  g.fillTriangle(x1 - w1, y1, x2 + w2, y2, x2 - w2, y2);
}
