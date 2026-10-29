// Порядок отрисовки объектов на дороге (деревья, машины): чем дальше, тем меньше depth.
// Все значения в диапазоне 1..2 — над дорогой (0), под кабиной (40).

const DEPTH_BASE = 1;
const DEPTH_SPAN = 0.98;
const Z_MAX = 5000;

export function depthForDistance(z: number): number {
  const k = z <= 0 ? 0 : z >= Z_MAX ? 1 : z / Z_MAX;
  return DEPTH_BASE + DEPTH_SPAN * (1 - k);
}
