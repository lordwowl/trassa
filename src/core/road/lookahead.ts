// Ближайший поворот впереди — для навигатора. Без аллокаций: результат пишется в out.

import type { Road, RoadSegment } from './types';
import { wrapZ } from './query';

export interface CurveAhead {
  /** −1 — налево, 1 — направо, 0 — поворотов в пределах дальности нет. */
  dir: number;
  /** До начала поворота, м (0 — уже в повороте). */
  distance: number;
  /** Наибольшая кривизна поворота, 1/м. */
  strength: number;
}

export function createCurveAhead(): CurveAhead {
  return { dir: 0, distance: 0, strength: 0 };
}

/**
 * Ищет первый сегмент с |curve| ≥ minCurve в пределах maxDist от z
 * и наибольшую кривизну этого поворота (пока знак тот же, в пределах maxDist).
 */
export function findCurveAhead(out: CurveAhead, road: Road, z: number, maxDist: number, minCurve: number): CurveAhead {
  const segs = road.segments;
  const n = segs.length;
  const L = road.segmentLength;
  const w = wrapZ(road, z);
  const base = Math.floor(w / L);
  const offset = w - base * L;
  const count = Math.min(n, Math.ceil((maxDist + offset) / L));
  out.dir = 0;
  out.distance = 0;
  out.strength = 0;
  for (let i = 0; i < count; i++) {
    const c = (segs[(base + i) % n] as RoadSegment).curve;
    if (out.dir === 0) {
      if (Math.abs(c) < minCurve) continue;
      out.dir = c < 0 ? -1 : 1;
      out.distance = Math.max(0, i * L - offset);
      out.strength = Math.abs(c);
    } else {
      if (c * out.dir <= 0) break;
      if (Math.abs(c) > out.strength) out.strength = Math.abs(c);
    }
  }
  return out;
}
