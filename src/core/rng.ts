// Seeded RNG (mulberry32). Единственный источник случайности в игре.
// Состояние — одно 32-битное число, его можно хранить в GameState.

export interface RngState {
  s: number;
}

export function createRng(seed: number): RngState {
  return { s: seed >>> 0 };
}

/** Следующее число в [0, 1). Мутирует состояние, без аллокаций. */
export function next(rng: RngState): number {
  rng.s = (rng.s + 0x6d2b79f5) >>> 0;
  let t = rng.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Вещественное в [min, max). */
export function range(rng: RngState, min: number, max: number): number {
  return min + (max - min) * next(rng);
}

/** Целое в [min, max] включительно. */
export function int(rng: RngState, min: number, max: number): number {
  return min + Math.floor(next(rng) * (max - min + 1));
}

/** true с вероятностью p. */
export function chance(rng: RngState, p: number): boolean {
  return next(rng) < p;
}

/** Случайный элемент непустого массива. */
export function pick<T>(rng: RngState, items: readonly T[]): T {
  if (items.length === 0) throw new Error('rng.pick: пустой массив');
  return items[int(rng, 0, items.length - 1)] as T;
}

/** Выбор индекса по весам (веса >= 0, сумма > 0). */
export function weightedIndex(rng: RngState, weights: readonly number[]): number {
  let total = 0;
  for (const w of weights) total += w;
  if (total <= 0) throw new Error('rng.weightedIndex: сумма весов должна быть > 0');
  let r = next(rng) * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i] as number;
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/** Seed из произвольной строки (FNV-1a), удобно для детерминированных подпотоков. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seed для нового запуска без ?seed=. Единственное место, где берётся внешняя энтропия. */
export function entropySeed(): number {
  return (Math.random() * 0x100000000) >>> 0;
}
