// Сегменты позади машины для зеркал: расстояние назад, смещение оси дороги и высоты.
// Без аллокаций: пишет в предвыделенные массивы.

import type { Road, RoadSegment } from './types';

export interface BehindSegments {
  count: number;
  /** Расстояние назад до ближнего и дальнего края, м (> 0). */
  dNear: Float32Array;
  dFar: Float32Array;
  /** Смещение оси дороги от продольной оси машины, м (вправо > 0). */
  xNear: Float32Array;
  xFar: Float32Array;
  /** Высоты краёв, м. */
  yNear: Float32Array;
  yFar: Float32Array;
  lanes: Int32Array;
  /** Номер сегмента (для чередования цветов). */
  segment: Int32Array;
}

export function createBehindSegments(capacity: number): BehindSegments {
  return {
    count: 0,
    dNear: new Float32Array(capacity),
    dFar: new Float32Array(capacity),
    xNear: new Float32Array(capacity),
    xFar: new Float32Array(capacity),
    yNear: new Float32Array(capacity),
    yFar: new Float32Array(capacity),
    lanes: new Int32Array(capacity),
    segment: new Int32Array(capacity),
  };
}

/**
 * Собирает до count сегментов позади точки z. Дорога позади отклоняется в ту же сторону,
 * что и впереди (центр поворота с той же стороны), поэтому смещение копится с тем же знаком.
 */
export function collectBehind(out: BehindSegments, road: Road, z: number, count: number): BehindSegments {
  const segs = road.segments;
  const n = segs.length;
  const L = road.segmentLength;
  const L2 = L * L;
  const zw = ((z % road.length) + road.length) % road.length;
  const base = Math.floor(zw / L);
  const into = zw - base * L;
  const cap = Math.min(count, out.dNear.length, n);
  // Высота точки z — интерполяция внутри текущего сегмента
  const cur = segs[base % n] as RoadSegment;
  const nextSeg = segs[(base + 1) % n] as RoadSegment;
  let yPrev = cur.y + (nextSeg.y - cur.y) * (into / L);
  let x = 0;
  let dx = 0;
  let d = 0;
  for (let k = 0; k < cap; k++) {
    const idx = (((base - k) % n) + n) % n;
    const s = segs[idx] as RoadSegment;
    // Первый — от машины до начала текущего сегмента, дальше — целые сегменты
    const len = k === 0 ? into : L;
    out.dNear[k] = d;
    out.yNear[k] = yPrev;
    out.xNear[k] = x;
    d += len;
    const frac = len / L;
    x += dx * frac;
    dx += s.curve * L2 * frac;
    out.dFar[k] = d;
    out.xFar[k] = x;
    out.yFar[k] = s.y;
    out.lanes[k] = s.lanes;
    out.segment[k] = idx;
    yPrev = s.y;
  }
  out.count = cap;
  return out;
}
