// Псевдо-3D отрисовка дороги (подход Javascript Racer).
// Проход вперёд: проекция сегментов в предвыделенные массивы и отсечение скрытых.
// Проход назад: рисование от дальних к ближним (ближние перекрывают дальние на холмах).
// В кадре нет аллокаций: только числовые массивы, созданные в конструкторе.
import Phaser from 'phaser';
import { heightAt, project, type ProjectionView, type Projected, type Road, type RoadSegment } from '../../core/road';
import { shade, type Lighting } from './lighting';

/** Цвета дороги при полном дневном свете; ночь, закат и фары — через освещение (lighting.ts). */
export interface RoadPalette {
  grassLight: number;
  grassDark: number;
  roadLight: number;
  roadDark: number;
  rumbleLight: number;
  rumbleDark: number;
  lane: number;
}

export const ROAD_PALETTE: RoadPalette = {
  grassLight: 0x5cae3a,
  grassDark: 0x4e9e30,
  roadLight: 0x6a6f74,
  roadDark: 0x64696e,
  rumbleLight: 0xf2f2f2,
  rumbleDark: 0xc0392b,
  lane: 0xf2f2f2,
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
/** Объекты ближе этого (м) не рисуются — уже «проехали». */
const SPRITE_NEAR_Z = 1;
/** Смещение, заведомо вне луча фар (освещение только общее). */
const OUTSIDE_BEAM = 1e6;

/**
 * Сегменты с придорожными объектами, собранные за кадр (от ближних к дальним).
 * x, y, scale — проекция начала сегмента (центр дороги); clip — экранная Y,
 * ниже которой объект закрыт более близкой дорогой (холмом).
 */
export interface SpriteSegments {
  count: number;
  segment: Int32Array;
  x: Float32Array;
  y: Float32Array;
  scale: Float32Array;
  clip: Float32Array;
  /** Расстояние от камеры, м (для освещения). */
  z: Float32Array;
}

/** Точка на дороге в экранных координатах (для машин трафика). */
export interface RoadPoint {
  x: number;
  y: number;
  /** Пикселей на метр. */
  scale: number;
  /** Экранная Y, ниже которой точка закрыта более близкой дорогой. */
  clip: number;
}

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
  /** Расстояние до ближнего края сегмента, м — для освещения. */
  private readonly zz: Float32Array;
  private readonly p: Projected = { x: 0, y: 0, scale: 0 };
  readonly sprites: SpriteSegments;
  // Каждый сегмент кадра по индексу i от камеры: ось дороги (x и приращение), высоты концов, линия закрытия
  private readonly segX: Float32Array;
  private readonly segDX: Float32Array;
  private readonly segY1: Float32Array;
  private readonly segY2: Float32Array;
  private readonly segTop: Float32Array;
  private frameSegs = 0;
  private frameOffset = 0;
  private frameL = 1;
  private frameCamY = 0;
  private frameCamX = 0;
  private frameView: ProjectionView | null = null;

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
    this.zz = new Float32Array(maxDrawDistance);
    this.segX = new Float32Array(maxDrawDistance);
    this.segDX = new Float32Array(maxDrawDistance);
    this.segY1 = new Float32Array(maxDrawDistance);
    this.segY2 = new Float32Array(maxDrawDistance);
    this.segTop = new Float32Array(maxDrawDistance);
    this.sprites = {
      count: 0,
      segment: new Int32Array(maxDrawDistance),
      x: new Float32Array(maxDrawDistance),
      y: new Float32Array(maxDrawDistance),
      scale: new Float32Array(maxDrawDistance),
      clip: new Float32Array(maxDrawDistance),
      z: new Float32Array(maxDrawDistance),
    };
  }

  get graphics(): Phaser.GameObjects.Graphics {
    return this.g;
  }

  render(road: Road, v: RoadView, pal: RoadPalette, lit: Lighting): void {
    const g = this.g;
    g.clear();
    const segs = road.segments;
    const n = segs.length;
    const L = road.segmentLength;
    const L2 = L * L;
    const draw = Math.min(this.cap, v.drawDistance, n);

    // Земля до горизонта: закрывает просвет между дальним краем дороги и горизонтом
    const horizon = v.view.horizonY;
    g.fillStyle(shade(pal.grassDark, lit, v.drawDistance * L));
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
    const sp = this.sprites;
    sp.count = 0;
    this.frameSegs = draw;
    this.frameOffset = offset;
    this.frameL = L;
    this.frameCamY = camY;
    this.frameCamX = v.x;
    this.frameView = v.view;

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
      this.segX[i] = xa;
      this.segDX[i] = dx;
      this.segY1[i] = ya;
      this.segY2[i] = yb;
      this.segTop[i] = top;
      x += dx;
      dx += s.curve * L2;
      // Объекты стоят у начала сегмента; закрыты всем, что ближе (top до этого сегмента)
      if (s.objects && za > SPRITE_NEAR_Z) {
        project(this.p, v.view, xa - v.x, ya - camY, za);
        const k = sp.count++;
        sp.segment[k] = idx;
        sp.x[k] = this.p.x;
        sp.y[k] = this.p.y;
        sp.scale[k] = this.p.scale;
        sp.clip[k] = top;
        sp.z[k] = za;
      }
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
      this.zz[count] = za;
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
      const z = this.zz[k] as number;
      const light = Math.floor((this.seg[k] as number) / STRIPE_LENGTH) % 2 === 0;
      // Без округления: иначе полоса травы на пиксель залезает на дальний асфальт
      const gb = this.gb[k] as number;
      const grass = light ? pal.grassLight : pal.grassDark;
      g.fillStyle(shade(grass, lit, z, OUTSIDE_BEAM));
      g.fillRect(0, y2, v.width, gb - y2);

      // Пятно фар на траве: узкий луч по оси машины (центр экрана), мягкий край в два шага
      const halfRoad = (lanes * v.laneWidth) / 2;
      const s1 = w1 / halfRoad;
      const s2 = w2 / halfRoad;
      if (lit.beamRange > 0 && z < lit.beamRange) {
        const cx = v.view.centerX;
        const outer = lit.beamWidth + lit.beamFade;
        const inner = lit.beamWidth + lit.beamFade * 0.35;
        g.fillStyle(shade(grass, lit, z, lit.beamWidth + lit.beamFade * 0.65));
        quad(g, cx, gb, outer * s1, cx, y2, outer * s2);
        g.fillStyle(shade(grass, lit, z, lit.beamWidth));
        quad(g, cx, gb, inner * s1, cx, y2, inner * s2);
      }
      // Смещение оси дороги от оси машины, м — чтобы в повороте дорога уходила из луча
      const lateral = (x1 - v.view.centerX) / s1;

      // Обочина-«зебра»: шире полотна на RUMBLE_WIDTH с каждой стороны
      const r1 = w1 * (1 + rumbleK / lanes);
      const r2 = w2 * (1 + rumbleK / lanes);
      g.fillStyle(shade(light ? pal.rumbleLight : pal.rumbleDark, lit, z, lateral));
      quad(g, x1, y1, r1, x2, y2, r2);

      g.fillStyle(shade(light ? pal.roadLight : pal.roadDark, lit, z, lateral));
      quad(g, x1, y1, w1, x2, y2, w2);

      // Разметка между полосами — пунктир
      if (light && lanes > 1) {
        // w — полуширина полотна в px; полуширина линии = w · (LANE_LINE_WIDTH / 2) / halfW
        const lw1 = (w1 * LANE_LINE_WIDTH) / (lanes * v.laneWidth);
        const lw2 = (w2 * LANE_LINE_WIDTH) / (lanes * v.laneWidth);
        g.fillStyle(shade(pal.lane, lit, z, lateral));
        for (let lane = 1; lane < lanes; lane++) {
          const f = (2 * lane) / lanes - 1;
          quad(g, x1 + w1 * f, y1, lw1, x2 + w2 * f, y2, lw2);
        }
      }
    }
  }

  /**
   * Проекция точки дороги на расстоянии d впереди камеры и смещении lateral от оси дороги (м)
   * по данным последнего кадра. false — точка вне дальности прорисовки или слишком близко.
   */
  projectOnRoad(out: RoadPoint, d: number, lateral: number): boolean {
    const view = this.frameView;
    if (!view || d < SPRITE_NEAR_Z) return false;
    const u = (d + this.frameOffset) / this.frameL;
    const i = Math.floor(u);
    if (i >= this.frameSegs) return false;
    const t = u - i;
    const roadX = (this.segX[i] as number) + (this.segDX[i] as number) * t;
    const y1 = this.segY1[i] as number;
    const roadY = y1 + ((this.segY2[i] as number) - y1) * t;
    project(this.p, view, roadX + lateral - this.frameCamX, roadY - this.frameCamY, d);
    out.x = this.p.x;
    out.y = this.p.y;
    out.scale = this.p.scale;
    out.clip = this.segTop[i] as number;
    return true;
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
