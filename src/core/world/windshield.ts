// Капли на лобовом стекле и дворники. Стекло — прямоугольник width×height (px, y вниз).
// Пул капель фиксированного размера: в кадре без аллокаций. Случайность — через переданный RNG.

import { next, range, type RngState } from '../rng';

export interface Wiper {
  /** Ось дворника, px. */
  px: number;
  py: number;
  /** Длина щётки от оси, px; ближе rInner капли не стираются. */
  length: number;
  rInner: number;
}

export interface WindshieldParams {
  width: number;
  height: number;
  /** Капель в секунду при rain = 1 стоя на месте. */
  dropRate: number;
  /** Во сколько раз больше капель на 10 м/с скорости. */
  speedFactor: number;
  /** Максимальный угол взмаха, рад (от горизонтали «влево» вверх). */
  wiperSweep: number;
  /** Период взмаха туда-обратно, с: медленно и быстро. */
  wiperSlow: number;
  wiperFast: number;
  wipers: Wiper[];
}

export interface Windshield {
  capacity: number;
  count: number;
  x: Float32Array;
  y: Float32Array;
  r: Float32Array;
  /** Фаза взмаха 0..1 (0 — щётки лежат внизу). */
  phase: number;
  angle: number;
  /** Накопитель дробной части капель. */
  spawnAcc: number;
}

export function createWindshield(capacity: number): Windshield {
  return {
    capacity,
    count: 0,
    x: new Float32Array(capacity),
    y: new Float32Array(capacity),
    r: new Float32Array(capacity),
    phase: 0,
    angle: 0,
    spawnAcc: 0,
  };
}

/** Угол щётки по фазе: плавно вверх до wiperSweep и обратно. */
export function wiperAngle(phase: number, sweep: number): number {
  return (sweep * (1 - Math.cos(2 * Math.PI * phase))) / 2;
}

function removeDrop(w: Windshield, i: number): void {
  const last = --w.count;
  w.x[i] = w.x[last] as number;
  w.y[i] = w.y[last] as number;
  w.r[i] = w.r[last] as number;
}

/** Стирает капли в секторе между углами a0 и a1 щётки. */
function sweep(w: Windshield, wp: Wiper, a0: number, a1: number): void {
  const lo = a0 < a1 ? a0 : a1;
  const hi = a0 < a1 ? a1 : a0;
  for (let i = w.count - 1; i >= 0; i--) {
    const dx = (w.x[i] as number) - wp.px;
    const dy = (w.y[i] as number) - wp.py;
    const d = Math.hypot(dx, dy);
    if (d < wp.rInner || d > wp.length) continue;
    // Угол от направления «влево» в сторону «вверх» (y вниз)
    const a = Math.atan2(-dy, -dx);
    if (a >= lo - 0.02 && a <= hi + 0.02) removeDrop(w, i);
  }
}

/**
 * Шаг стекла: новые капли по интенсивности дождя и скорости, движение капель, взмах дворников.
 * wiperMode: 0 — выкл (щётки доходят до низа и останавливаются), 1 — медленно, 2 — быстро.
 */
export function stepWindshield(w: Windshield, p: WindshieldParams, rain: number, speed: number, wiperMode: number, rng: RngState, dt: number): void {
  // Новые капли
  if (rain > 0) {
    w.spawnAcc += rain * p.dropRate * (1 + (speed / 10) * p.speedFactor) * dt;
    while (w.spawnAcc >= 1) {
      w.spawnAcc -= 1;
      if (w.count >= w.capacity) continue;
      const i = w.count++;
      w.x[i] = next(rng) * p.width;
      w.y[i] = next(rng) * p.height;
      w.r[i] = range(rng, 2, 4 + rain * 3);
    }
  } else {
    w.spawnAcc = 0;
  }

  // Стоя капли стекают вниз, на скорости их сдувает вверх
  const vy = 8 - speed * 1.5;
  for (let i = w.count - 1; i >= 0; i--) {
    const y = (w.y[i] as number) + vy * dt * (0.5 + (w.r[i] as number) / 8);
    w.y[i] = y;
    if (y < -10 || y > p.height + 10) removeDrop(w, i);
  }

  // Дворники
  const period = wiperMode === 2 ? p.wiperFast : p.wiperSlow;
  if (wiperMode > 0 || w.phase > 0) {
    const a0 = w.angle;
    let ph = w.phase + dt / period;
    if (ph >= 1) ph = wiperMode > 0 ? ph - 1 : 0; // выключены — доходят до низа и паркуются
    w.phase = ph;
    w.angle = wiperAngle(ph, p.wiperSweep);
    for (let k = 0; k < p.wipers.length; k++) sweep(w, p.wipers[k] as Wiper, a0, w.angle);
  }
}

/** Доля стекла, закрытая каплями, 0..1 (для лёгкой «мутности»). */
export function dropCoverage(w: Windshield, p: WindshieldParams): number {
  let s = 0;
  for (let i = 0; i < w.count; i++) {
    const r = w.r[i] as number;
    s += Math.PI * r * r;
  }
  const c = (s * 6) / (p.width * p.height);
  return c > 1 ? 1 : c;
}
