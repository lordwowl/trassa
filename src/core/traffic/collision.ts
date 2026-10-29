// Столкновение машины игрока с трафиком: удар вдоль дороги (догнал, догнали, лобовое)
// или касание боком. Скорости после удара — неупругий удар с учётом масс;
// повреждение пропорционально разнице скоростей (GDD 5.4). Без аллокаций: результат пишется в out.

import type { CarState } from '../car';
import type { TrafficKind } from './kinds';
import type { TrafficCar, TrafficState } from './types';

export type HitKind = 'none' | 'front' | 'rear' | 'headon' | 'side';

export interface CollisionParams {
  /** Габариты игрока относительно точки car.z (глаза водителя), м. */
  front: number;
  rear: number;
  width: number;
  /** % повреждения на 1 м/с разницы скоростей. */
  damagePerImpact: number;
  /** % повреждения при касании боком. */
  damageSide: number;
  /** Сколько стоит машина трафика после удара, с. */
  stunTime: number;
}

export interface CollisionResult {
  kind: HitKind;
  /** Скорость сближения в момент удара, м/с. */
  impact: number;
  /** Добавленное повреждение, %. */
  damage: number;
  /** Индекс машины трафика в пуле (−1 — нет удара). */
  car: number;
  /** После удара повреждения не начисляются столько секунд (скрежет боком, толкание), с. */
  cooldown: number;
}

/** Перекрытие по ширине меньше этого (м) при длинном перекрытии вдоль — касание боком. */
const SIDE_CONTACT = 0.45;
/** Коэффициент восстановления: 0 — машины «слипаются», 1 — отскакивают. */
const RESTITUTION = 0.2;
/** Зазор после разведения машин, м. */
const SEPARATION = 0.05;
/** Касание боком гасит скорость. */
const SIDE_SPEED_KEEP = 0.9;
/** Удар мягче этого (м/с) — толкание без повреждений. */
const MIN_IMPACT = 1.5;
/** Пауза между ударами с повреждением, с. */
const HIT_COOLDOWN = 0.5;

export function createCollisionResult(): CollisionResult {
  return { kind: 'none', impact: 0, damage: 0, car: -1, cooldown: 0 };
}

/**
 * Ищет первое пересечение игрока с машиной трафика и разрешает его:
 * меняет скорости и положения (игрок выталкивается из машины), машина трафика встаёт на stunTime.
 * Повреждение начисляется только за ощутимый удар и не чаще раза в HIT_COOLDOWN.
 */
export function collideTraffic(out: CollisionResult, t: TrafficState, kinds: readonly TrafficKind[], car: CarState,
  p: CollisionParams, dt: number): CollisionResult {
  out.cooldown = out.cooldown > dt ? out.cooldown - dt : 0;
  out.kind = 'none';
  out.impact = 0;
  out.damage = 0;
  out.car = -1;
  const pFront = car.z + p.front;
  const pRear = car.z - p.rear;
  const pMid = (pFront + pRear) / 2;
  for (let i = 0; i < t.cars.length; i++) {
    const c = t.cars[i] as TrafficCar;
    if (!c.active) continue;
    const cMin = c.z - c.length / 2;
    const cMax = c.z + c.length / 2;
    const overlapZ = Math.min(pFront, cMax) - Math.max(pRear, cMin);
    if (overlapZ <= 0) continue;
    const dx = c.x - car.x;
    const overlapX = (p.width + c.width) / 2 - Math.abs(dx);
    if (overlapX <= 0) continue;

    const vP = car.speed;
    const vC = c.dir * c.speed;
    out.car = i;
    if (overlapX < SIDE_CONTACT && overlapZ > SIDE_CONTACT) {
      // Касание боком: расталкиваем по ширине, немного теряем скорость
      car.x -= Math.sign(dx || 1) * (overlapX + SEPARATION);
      car.speed *= SIDE_SPEED_KEEP;
      out.kind = 'side';
      out.impact = Math.abs(vP - vC);
      out.damage = p.damageSide;
      return applyCooldown(out);
    }
    const ahead = c.z > pMid;
    // Скорость сближения: догоняем впереди идущего / нас догоняют / лобовое
    const closing = ahead ? vP - vC : vC - vP;
    const mC = (kinds[c.kind] as TrafficKind).mass;
    const sum = 1 + mC;
    const vP2 = (vP + mC * vC + mC * RESTITUTION * (vC - vP)) / sum;
    const vC2 = (vP + mC * vC + RESTITUTION * (vP - vC)) / sum;
    car.speed = vP2 > 0 ? vP2 : 0;
    // Машина трафика не едет назад: если удар развернул скорость — стоит.
    // Лобовое — обе машины встают (иначе встречная продолжала бы толкать игрока и бить повторно)
    const along = c.dir * vC2;
    c.speed = c.dir < 0 || along <= 0 ? 0 : along;
    if (c.dir < 0) car.speed = 0;
    c.stun = p.stunTime;
    // Разводим: игрок выталкивается из машины
    car.z = ahead ? cMin - p.front - SEPARATION : cMax + p.rear + SEPARATION;
    out.kind = c.dir < 0 ? 'headon' : ahead ? 'front' : 'rear';
    out.impact = closing > 0 ? closing : 0;
    out.damage = out.impact >= MIN_IMPACT ? out.impact * p.damagePerImpact : 0;
    return applyCooldown(out);
  }
  return out;
}

function applyCooldown(out: CollisionResult): CollisionResult {
  if (out.damage <= 0) return out;
  if (out.cooldown > 0) out.damage = 0;
  else out.cooldown = HIT_COOLDOWN;
  return out;
}
