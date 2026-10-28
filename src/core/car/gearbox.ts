// КПП и двигатель (GDD 5.2): обороты из скорости и передачи, тяга по оборотам, отсечка, автомат.
// Без аллокаций: меняет состояние машины.

import type { CarInput, CarParams, CarState } from './types';

/** Максимальная скорость передачи g (1..gearCount) на отсечке, м/с. */
export function gearTopSpeed(p: CarParams, g: number): number {
  const i = Math.min(Math.max(g, 1), p.gearCount) - 1;
  return p.maxSpeed * (p.gearTops[i] ?? 1);
}

/** Доля оборотов на передаче g: 0 — холостые, 1 — отсечка. */
export function rpmRatio(p: CarParams, speed: number, g: number): number {
  const top = gearTopSpeed(p, g);
  return top > 0 ? speed / top : 0;
}

/** Множитель момента по доле оборотов: максимум в середине, на отсечке — 0. */
export function torqueCurve(r: number): number {
  if (r >= 1) return 0;
  const k = r < 0 ? 0 : r;
  return 0.7 + 0.3 * Math.sin(Math.PI * k);
}

/** Обработка переключений (автомат или запрос механики). */
export function updateGear(car: CarState, input: CarInput, p: CarParams, dt: number): void {
  if (car.shiftTimer > 0) car.shiftTimer = Math.max(0, car.shiftTimer - dt);
  if (car.gear > p.gearCount) car.gear = p.gearCount;
  if (car.gear < 1) car.gear = 1;

  if (input.manual) {
    // Запрос во время переключения ждёт его окончания, а не теряется
    if (input.shift !== 0 && car.shiftTimer <= 0) {
      const g = car.gear + (input.shift > 0 ? 1 : -1);
      if (g >= 1 && g <= p.gearCount) {
        car.gear = g;
        car.shiftTimer = p.shiftTime;
      }
      input.shift = 0;
    }
    return;
  }
  input.shift = 0;
  if (car.shiftTimer > 0) return;
  const r = rpmRatio(p, car.speed, car.gear);
  // Вверх — на газу или если обороты уже за отсечкой
  if (car.gear < p.gearCount && ((r > p.upshiftAt && input.throttle > 0) || r > 1)) {
    car.gear++;
    car.shiftTimer = p.shiftTime;
  } else if (r < p.downshiftAt && car.gear > 1) {
    car.gear--;
    car.shiftTimer = p.shiftTime * 0.5;
  }
}

/**
 * Продольное ускорение от двигателя, м/с² (тяга минус торможение двигателем).
 * Обновляет обороты и счётчик перекрута.
 */
export function engineAccel(car: CarState, throttle: number, p: CarParams, dt: number): number {
  const r = rpmRatio(p, car.speed, car.gear);
  const span = p.redline - p.idleRpm;
  // На месте с газом сцепление пробуксовывает — обороты поднимаются
  const slip = car.gear === 1 ? throttle * 0.35 : 0;
  car.rpm = p.idleRpm + span * Math.min(1.1, Math.max(r, slip));

  let a = 0;
  if (car.shiftTimer <= 0) {
    const last = gearTopSpeed(p, p.gearCount);
    const boost = Math.pow(last / gearTopSpeed(p, car.gear), p.gearBoost);
    a += throttle * p.accel * boost * torqueCurve(r);
  }
  a -= (1 - throttle) * p.engineBrake;
  if (r > 1.02) {
    // Перекрут на механике: двигатель тормозит сильнее
    car.overRevTime += dt;
    a -= p.engineBrake * Math.min(4, (r - 1) * 20);
  }
  return a;
}
