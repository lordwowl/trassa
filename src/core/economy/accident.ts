// Авария и эвакуатор (GDD 5.5): сильное лобовое — потеря времени и денег, рейс продолжается;
// 100% повреждений — платный эвакуатор с аварийным ремонтом или рейс заново.
// Чистые функции: считают последствия и применяют их к GameState.

import type { GameState } from '../state';

export interface AccidentParams {
  /** Лобовое с такой скоростью сближения (м/с) и сильнее — экран «авария». */
  headonImpact: number;
  /** Оформление ДТП и ремонт на месте: база и надбавка за 1 м/с удара, кредиты. */
  costBase: number;
  costPerImpact: number;
  /** Потеря времени на месте аварии, ч. */
  timeLoss: number;
  /** Эвакуатор: вызов, цена за км, расстояние до ближайшего города/СТО (пока условное), км; скорость, км/ч. */
  towBase: number;
  towPerKm: number;
  towDistance: number;
  towSpeed: number;
  /** После эвакуатора и аварийного ремонта повреждения, %. */
  towRepairTo: number;
}

export type AccidentKind = 'crash' | 'tow';

export interface AccidentOutcome {
  kind: AccidentKind;
  /** Цена, кредиты (целые); списывается не больше, чем есть. */
  cost: number;
  /** Потеря времени, ч. */
  hours: number;
  /** Повреждения после (для эвакуатора — после аварийного ремонта), %. */
  damageAfter: number;
}

/** Нужен ли экран «авария» после удара. */
export function isSevereCrash(kind: string, impact: number, p: AccidentParams): boolean {
  return kind === 'headon' && impact >= p.headonImpact;
}

/** Последствия аварии: оформление и ремонт на месте, повреждения остаются. */
export function crashOutcome(impact: number, damage: number, p: AccidentParams): AccidentOutcome {
  return {
    kind: 'crash',
    cost: Math.round(p.costBase + p.costPerImpact * impact),
    hours: p.timeLoss,
    damageAfter: damage,
  };
}

/** Эвакуатор до ближайшего города/СТО и аварийный ремонт, чтобы доехать. */
export function towOutcome(p: AccidentParams): AccidentOutcome {
  return {
    kind: 'tow',
    cost: Math.round(p.towBase + p.towPerKm * p.towDistance),
    hours: 0.5 + p.towDistance / p.towSpeed,
    damageAfter: p.towRepairTo,
  };
}

/** Применяет последствия: деньги (не уходят в минус), время суток, повреждения. Возвращает списанную сумму. */
export function applyOutcome(state: GameState, o: AccidentOutcome): number {
  const paid = Math.min(state.money, o.cost);
  state.money -= paid;
  state.timeOfDay = (((state.timeOfDay + o.hours) % 24) + 24) % 24;
  state.damage = o.damageAfter;
  return paid;
}
