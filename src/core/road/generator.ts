// Генератор замкнутой тестовой трассы по seed.

import { chance, int, next, range, type RngState } from '../rng';
import { addSection, addStraight, createDraft, type RoadDraft } from './builder';
import type { Road } from './types';

export interface RoadGenParams {
  segmentLength: number;
  /** Желаемая длина трассы, м (фактическая немного больше). */
  length: number;
  /** Максимальная кривизна, 1/м. */
  curveMax: number;
  /** Максимальный перепад высоты одного холма, м. */
  hillMax: number;
  /** Максимальный уклон (0.1 = 10%). */
  maxGrade: number;
  lanes: number;
}

/** Перепад, допустимый на участке из n сегментов: пик уклона easeInOut = dy·π/(2n) на сегмент. */
function clampDy(dy: number, n: number, p: RoadGenParams): number {
  const max = (p.maxGrade * p.segmentLength * 2 * n) / Math.PI;
  return Math.max(-max, Math.min(max, dy));
}

function randomSection(rng: RngState, draft: RoadDraft, p: RoadGenParams, segPer100m: number): void {
  const sign = chance(rng, 0.5) ? -1 : 1;
  const len = (m: number): number => Math.max(1, Math.round((m / 100) * segPer100m));
  const curve = sign * range(rng, 0.25, 1) * p.curveMax;
  // Высота не уходит далеко от нуля: выше 2·hillMax — только спуск, ниже −2·hillMax — только подъём
  let dir = chance(rng, 0.5) ? -1 : 1;
  if (draft.endY > 2 * p.hillMax) dir = -1;
  else if (draft.endY < -2 * p.hillMax) dir = 1;
  const hill = dir * range(rng, 0.3, 1) * p.hillMax;
  const r = next(rng);
  if (r < 0.25) {
    addStraight(draft, len(range(rng, 150, 500)), p.lanes);
  } else if (r < 0.55) {
    // Поворот
    addSection(draft, { enter: len(range(rng, 40, 100)), hold: len(range(rng, 50, 250)), leave: len(range(rng, 40, 100)), curve, dy: 0, lanes: p.lanes });
  } else if (r < 0.75) {
    // Холм (подъём или спуск)
    const n = len(range(rng, 200, 600));
    addSection(draft, { enter: 0, hold: n, leave: 0, curve: 0, dy: clampDy(hill, n, p), lanes: p.lanes });
  } else if (r < 0.9) {
    // Поворот на холме
    const enter = len(range(rng, 40, 100));
    const hold = len(range(rng, 100, 250));
    const leave = len(range(rng, 40, 100));
    addSection(draft, { enter, hold, leave, curve, dy: clampDy(hill, enter + hold + leave, p), lanes: p.lanes });
  } else {
    // S-образная связка
    const half = { enter: len(60), hold: len(range(rng, 40, 120)), leave: len(60), dy: 0, lanes: p.lanes };
    addSection(draft, { ...half, curve });
    addSection(draft, { ...half, curve: -curve });
  }
}

export function generateRoad(rng: RngState, p: RoadGenParams): Road {
  if (p.segmentLength <= 0) throw new Error('generateRoad: segmentLength должен быть > 0');
  const segPer100m = 100 / p.segmentLength;
  const draft = createDraft();
  // Старт с прямой
  addStraight(draft, Math.round(2 * segPer100m), p.lanes);
  const target = Math.max(1, Math.ceil(p.length / p.segmentLength));
  while (draft.segments.length < target) randomSection(rng, draft, p, segPer100m);
  // Замыкание: плавно вернуть высоту к 0 и выровнять дорогу перед стартом
  const minClose = Math.ceil((Math.abs(draft.endY) * Math.PI) / (2 * p.maxGrade * p.segmentLength));
  const close = Math.max(minClose, int(rng, 2, 4) * Math.round(segPer100m));
  addSection(draft, { enter: 0, hold: close, leave: 0, curve: 0, dy: -draft.endY, lanes: p.lanes });
  addStraight(draft, Math.round(segPer100m), p.lanes);
  const segments = draft.segments;
  return { segments, segmentLength: p.segmentLength, length: segments.length * p.segmentLength };
}
