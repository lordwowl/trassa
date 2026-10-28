// Расстановка придорожных объектов по seed. Отдельный поток RNG: геометрия трассы не меняется.

import { chance, range, type RngState } from '../rng';
import type { Road, RoadObject, RoadSegment } from './types';

export interface RoadsideParams {
  laneWidth: number;
  /** Деревьев на 100 м с каждой стороны (в среднем). */
  treeDensity: number;
  /** Ближе этого к краю полотна деревья не растут, м. */
  treeMinOffset: number;
  /** Дальше этого от края деревья не ставятся, м. */
  treeMaxOffset: number;
  /** Шаг столбов вдоль правой обочины, м (0 — без столбов). */
  poleSpacing: number;
  /** Отступ столбов от края полотна, м. */
  poleOffset: number;
  /** Средний шаг знаков, м (0 — без знаков). */
  signSpacing: number;
}

function push(seg: RoadSegment, o: RoadObject): void {
  if (seg.objects) seg.objects.push(o);
  else seg.objects = [o];
}

/** Добавляет объекты в сегменты дороги (мутирует road). Старые объекты удаляются. */
export function decorateRoad(road: Road, rng: RngState, p: RoadsideParams): void {
  const L = road.segmentLength;
  const treeChance = Math.min(1, (p.treeDensity * L) / 100);
  const signChance = p.signSpacing > 0 ? Math.min(1, L / p.signSpacing) : 0;
  const poleEvery = p.poleSpacing > 0 ? Math.max(1, Math.round(p.poleSpacing / L)) : 0;

  for (let i = 0; i < road.segments.length; i++) {
    const seg = road.segments[i] as RoadSegment;
    delete seg.objects;
    const half = (seg.lanes * p.laneWidth) / 2;
    for (const side of [-1, 1]) {
      if (chance(rng, treeChance)) {
        const offset = half + range(rng, p.treeMinOffset, p.treeMaxOffset);
        push(seg, { kind: chance(rng, 0.55) ? 'tree' : 'tree_round', x: side * offset, scale: range(rng, 0.75, 1.3) });
      }
    }
    if (poleEvery > 0 && i % poleEvery === 0) push(seg, { kind: 'pole', x: half + p.poleOffset, scale: 1 });
    // Знаки — справа по ходу, ближе столбов
    if (chance(rng, signChance)) push(seg, { kind: 'sign', x: half + p.poleOffset * 0.6, scale: 1 });
  }
}
