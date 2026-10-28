// Чистая математика управления: без Phaser и DOM, покрыта тестами.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function inRect(r: Rect, px: number, py: number, margin = 0): boolean {
  return px >= r.x - margin && px <= r.x + r.w + margin && py >= r.y - margin && py <= r.y + r.h + margin;
}

/**
 * Сила нажатия педали по высоте пальца: внизу педали — minValue, вверху — 1.
 * Палец за пределами по вертикали ограничивается краями.
 */
export function pedalValue(r: Rect, py: number, minValue: number): number {
  const t = 1 - (py - r.y) / r.h;
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  return minValue + (1 - minValue) * k;
}

/**
 * Угол наклона телефона «как руля», градусы: вправо (по часовой) > 0.
 * gx, gy — accelerationIncludingGravity в осях устройства (при вертикальном положении gy ≈ +9.8),
 * screenAngle — screen.orientation.angle (0, 90, 180, 270).
 * Возвращает null, если телефон лежит почти плашмя и угол не определить.
 */
export function rollFromGravity(gx: number, gy: number, screenAngle: number, minMagnitude = 2): number | null {
  const a = (screenAngle * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  // Вектор «вверх» в координатах экрана
  const right = gx * cos - gy * sin;
  const up = gx * sin + gy * cos;
  if (Math.hypot(right, up) < minMagnitude) return null;
  // При повороте телефона по часовой «верх» мира на экране уходит влево (right < 0)
  return (Math.atan2(-right, up) * 180) / Math.PI;
}

/** Руль −1..1 из угла: мёртвая зона у нуля, полный руль на maxAngle. */
export function tiltToSteer(rollDeg: number, zeroDeg: number, maxAngle: number, deadzone: number): number {
  let d = rollDeg - zeroDeg;
  // Нормализация в −180..180 (на случай калибровки около ±180)
  d = ((((d + 180) % 360) + 360) % 360) - 180;
  const s = Math.sign(d);
  const m = Math.abs(d) - deadzone;
  if (m <= 0) return 0;
  const range = maxAngle - deadzone;
  if (range <= 0) return s;
  return s * Math.min(1, m / range);
}

/** Экспоненциальное сглаживание с постоянной времени tau (с). */
export function smooth(prev: number, target: number, dt: number, tau: number): number {
  if (tau <= 0) return target;
  return prev + (target - prev) * (1 - Math.exp(-dt / tau));
}
