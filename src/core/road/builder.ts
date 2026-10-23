// Сборка дороги из участков с плавными входами/выходами (подход Javascript Racer).

import type { RoadSegment } from './types';

export function easeIn(a: number, b: number, t: number): number {
  return a + (b - a) * t * t;
}

export function easeInOut(a: number, b: number, t: number): number {
  return a + (b - a) * (-Math.cos(t * Math.PI) / 2 + 0.5);
}

export interface SectionSpec {
  /** Число сегментов входа, удержания и выхода из поворота. */
  enter: number;
  hold: number;
  leave: number;
  /** Кривизна на удержании, 1/м. */
  curve: number;
  /** Изменение высоты за участок, м. */
  dy: number;
  lanes: number;
}

/** Черновик дороги: сегменты + высота конца последнего сегмента (начала следующего). */
export interface RoadDraft {
  segments: RoadSegment[];
  endY: number;
}

export function createDraft(): RoadDraft {
  return { segments: [], endY: 0 };
}

/** Добавляет участок: кривизна плавно входит и выходит, высота меняется по easeInOut. */
export function addSection(draft: RoadDraft, s: SectionSpec): void {
  const total = s.enter + s.hold + s.leave;
  if (total <= 0) return;
  const segments = draft.segments;
  const startY = draft.endY;
  const endY = startY + s.dy;
  for (let n = 0; n < total; n++) {
    let curve: number;
    if (n < s.enter) curve = easeIn(0, s.curve, n / s.enter);
    else if (n < s.enter + s.hold) curve = s.curve;
    else curve = easeInOut(s.curve, 0, (n - s.enter - s.hold) / s.leave);
    // Высота начала сегмента n; конец участка = endY
    const y = easeInOut(startY, endY, n / total);
    segments.push({ curve, y, lanes: s.lanes });
  }
  draft.endY = endY;
}

export function addStraight(draft: RoadDraft, count: number, lanes: number): void {
  addSection(draft, { enter: 0, hold: count, leave: 0, curve: 0, dy: 0, lanes });
}
