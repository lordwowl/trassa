// Игровые часы и освещённость по времени суток.

/** Время суток в часах [0, 24) после dt реальных секунд; timeSpeed — игровых секунд в реальной. */
export function advanceClock(hour: number, dt: number, timeSpeed: number): number {
  const h = hour + (dt * timeSpeed) / 3600;
  return ((h % 24) + 24) % 24;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Рассвет и закат, часы. */
export const DAWN_START = 5;
export const DAWN_END = 7;
export const DUSK_START = 18;
export const DUSK_END = 20.5;

/** Дневной свет 0 (ночь) .. 1 (день), плавно на рассвете и закате. */
export function daylight(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  return smoothstep(DAWN_START, DAWN_END, h) * (1 - smoothstep(DUSK_START, DUSK_END, h));
}

/** Сила «золотого часа» 0..1: максимум посередине рассвета и заката. */
export function twilight(hour: number): number {
  const d = daylight(hour);
  return 4 * d * (1 - d);
}

/** «ЧЧ:ММ». */
export function formatClock(hour: number): string {
  const total = Math.floor((((hour % 24) + 24) % 24) * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${hh < 10 ? '0' : ''}${hh}:${mm < 10 ? '0' : ''}${mm}`;
}
