// Попутный и встречный трафик: появление в окне вокруг игрока, исчезновение позади,
// следование за впереди идущим по модели IDM (тормозит перед медленным, держит интервал); обгоны и реакции — ai.ts.
// Случайность — отдельный поток RNG; пул фиксированного размера, без аллокаций в шаге.

import { createRng, next, range, weightedIndex } from '../rng';
import type { Road, RoadSegment } from '../road';
import type { TrafficKind } from './kinds';
import { findLeader, laneCenter, moveLateral, updateAi } from './ai';
import type { TrafficCar, TrafficParams, TrafficPlayer, TrafficState } from './types';

/** Не ставить новую машину ближе этого к другой в той же полосе, м. */
const SPAWN_GAP = 60;
/** Запас за окном впереди, после которого уехавшая вперёд машина исчезает, м. */
const AHEAD_MARGIN = 300;
/** Пауза между попытками появления, с. */
const SPAWN_PAUSE_MIN = 0.4;
const SPAWN_PAUSE_MAX = 1.6;
/** Экстренное торможение, м/с². */
const MAX_DECEL = 9;
/** Палитра — 8 цветов (рендер берёт по модулю). */
const PAINTS = 8;

export function createTraffic(poolSize: number, seed: number): TrafficState {
  const cars: TrafficCar[] = [];
  for (let i = 0; i < poolSize; i++) {
    cars.push({ active: false, kind: 0, paint: 0, dir: 1, lane: 0, z: 0, x: 0, speed: 0, cruise: 0, length: 4, width: 1.8, stun: 0,
      phase: 0, phaseTime: 0, target: -1, signal: 0, yieldTime: 0, evadeTime: 0, wobbleTime: 0, flashTime: 0, flashed: false });
  }
  return { cars, rng: createRng(seed), spawnTimer: [0, 0] };
}

/** Полос в одном направлении на сегменте под точкой z. */
function lanesPerDir(road: Road, z: number): number {
  const n = road.segments.length;
  const i = Math.floor((((z % road.length) + road.length) % road.length) / road.segmentLength) % n;
  const lanes = (road.segments[i] as RoadSegment).lanes;
  return lanes >= 2 ? Math.floor(lanes / 2) : 1;
}

function halfRoadAt(road: Road, z: number, laneWidth: number): number {
  const n = road.segments.length;
  const i = Math.floor((((z % road.length) + road.length) % road.length) / road.segmentLength) % n;
  return ((road.segments[i] as RoadSegment).lanes * laneWidth) / 2;
}

function countInWindow(t: TrafficState, dir: number): number {
  let n = 0;
  for (let i = 0; i < t.cars.length; i++) {
    const c = t.cars[i] as TrafficCar;
    if (c.active && c.dir === dir) n++;
  }
  return n;
}

function laneFree(t: TrafficState, dir: number, lane: number, z: number): boolean {
  for (let i = 0; i < t.cars.length; i++) {
    const c = t.cars[i] as TrafficCar;
    if (c.active && c.dir === dir && c.lane === lane && Math.abs(c.z - z) < SPAWN_GAP) return false;
  }
  return true;
}

/** Ставит машину в полосу, если есть свободное место в пуле и полоса свободна. */
function spawn(t: TrafficState, kinds: readonly TrafficKind[], weights: readonly number[], p: TrafficParams,
  road: Road, dir: number, z: number): boolean {
  const lane = Math.floor(next(t.rng) * lanesPerDir(road, z));
  if (!laneFree(t, dir, lane, z)) return false;
  let slot: TrafficCar | null = null;
  for (let i = 0; i < t.cars.length; i++) {
    const c = t.cars[i] as TrafficCar;
    if (!c.active) {
      slot = c;
      break;
    }
  }
  if (!slot) return false;
  const kindIndex = weightedIndex(t.rng, weights);
  const k = kinds[kindIndex] as TrafficKind;
  slot.active = true;
  slot.kind = kindIndex;
  slot.paint = Math.floor(next(t.rng) * PAINTS);
  slot.dir = dir;
  slot.lane = lane;
  slot.z = z;
  slot.x = laneCenter(dir, lane, p.laneWidth);
  slot.cruise = range(t.rng, k.speedMin, k.speedMax) * p.speedScale;
  slot.speed = slot.cruise;
  slot.length = k.length;
  slot.width = k.width;
  slot.stun = 0;
  slot.phase = 0;
  slot.phaseTime = 0;
  slot.target = -1;
  slot.signal = 0;
  slot.yieldTime = 0;
  slot.evadeTime = 0;
  slot.wobbleTime = 0;
  slot.flashTime = 0;
  slot.flashed = false;
  return true;
}

function target(p: TrafficParams, dir: number): number {
  const windowKm = (p.spawnAhead + p.despawnBehind) / 1000;
  return (dir > 0 ? p.density : p.oncomingDensity) * windowKm;
}

/** Начальное заполнение окна вокруг игрока (в начале рейса). */
export function populateTraffic(t: TrafficState, kinds: readonly TrafficKind[], weights: readonly number[], p: TrafficParams,
  road: Road, playerZ: number): void {
  for (const dir of [1, -1]) {
    const want = Math.round(target(p, dir));
    // Попутные — не вплотную к игроку; встречные — впереди, чтобы не появиться сбоку
    const from = dir > 0 ? 50 : 120;
    for (let tries = 0; tries < want * 4 && countInWindow(t, dir) < want; tries++) {
      spawn(t, kinds, weights, p, road, dir, playerZ + range(t.rng, from, p.spawnAhead));
    }
  }
}

/**
 * Шаг трафика. weights — доли видов (заранее собранный массив, чтобы не выделять память).
 */
export function stepTraffic(t: TrafficState, kinds: readonly TrafficKind[], weights: readonly number[], p: TrafficParams,
  road: Road, player: TrafficPlayer, dt: number): void {
  const cars = t.cars;
  const sqrtAB = 2 * Math.sqrt(p.accel * p.brake);
  for (let i = 0; i < cars.length; i++) {
    const c = cars[i] as TrafficCar;
    if (!c.active) continue;
    // Впереди идущий по ширине (в т.ч. встречный в своей полосе) и решения ИИ: обгон, реакции на игрока
    const l = findLeader(t, i, player);
    const ai = updateAi(t, i, l, p, player, t.rng, dt);
    const gap = l.gap;
    const leaderSpeed = l.speed;
    const cruise = c.cruise * ai.speedFactor;
    // IDM: свободный разгон до cruise и торможение по интервалу до впереди идущего
    const v = c.speed;
    const r = v / cruise;
    let acc = 1 - r * r * r * r;
    if (gap < Infinity) {
      const s = p.minGap + Math.max(0, v * p.headway + (v * (v - leaderSpeed)) / sqrtAB);
      const q = s / Math.max(gap, 0.1);
      acc -= q * q;
    }
    acc *= p.accel;
    // После удара машина тормозит до остановки и стоит
    if (c.stun > 0) {
      c.stun -= dt;
      acc = -p.brake * 2;
    }
    const maxDecel = ai.maxDecel < MAX_DECEL ? ai.maxDecel : MAX_DECEL;
    if (acc < -maxDecel) acc = -maxDecel;
    c.speed = Math.max(0, v + acc * dt);
    c.z += c.dir * c.speed * dt;
    moveLateral(c, ai.targetX, p, halfRoadAt(road, c.z, p.laneWidth), dt);
    const rel = c.z - player.z;
    if (rel > p.spawnAhead + AHEAD_MARGIN || rel < -p.despawnBehind) c.active = false;
  }

  // Появление: впереди на краю окна, если в направлении меньше машин, чем нужно по плотности
  const timers = t.spawnTimer;
  for (let d = 0; d < 2; d++) {
    const dir = d === 0 ? 1 : -1;
    timers[d] = (timers[d] as number) - dt;
    if ((timers[d] as number) > 0) continue;
    timers[d] = range(t.rng, SPAWN_PAUSE_MIN, SPAWN_PAUSE_MAX);
    if (countInWindow(t, dir) < target(p, dir)) spawn(t, kinds, weights, p, road, dir, player.z + p.spawnAhead);
  }
}

/** Убрать машины ближе dist (м) к точке z — после аварии, чтобы рейс продолжился с чистой дороги. */
export function clearTrafficNear(t: TrafficState, z: number, dist: number): void {
  for (let i = 0; i < t.cars.length; i++) {
    const c = t.cars[i] as TrafficCar;
    if (c.active && Math.abs(c.z - z) < dist) c.active = false;
  }
}

/** Доли видов для weightedIndex — собрать один раз. */
export function kindWeights(kinds: readonly TrafficKind[]): number[] {
  return kinds.map((k) => k.weight);
}
