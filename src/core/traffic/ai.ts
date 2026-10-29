// ИИ трафика: поиск впереди идущего по боковому перекрытию (с учётом встречных в своей полосе),
// обгон по встречной полосе с поворотником и проверкой, что встречка свободна,
// реакции на игрока: уступить на гудок, уйти к обочине от игрока на своей полосе, ошибка под дальним светом.
// Без аллокаций: результаты пишутся в общие объекты модуля.

import { chance, type RngState } from '../rng';
import {
  OVERTAKE_ABORT, OVERTAKE_NONE, OVERTAKE_PASS, OVERTAKE_RETURN, OVERTAKE_SIGNAL, PLAYER_TARGET,
  type TrafficCar, type TrafficParams, type TrafficPlayer, type TrafficState,
} from './types';

/** Запас к ширинам при проверке «в одной полосе», м. */
const LANE_MARGIN = 0.2;
/** Впереди идущий ближе этого и медленнее — повод обогнать, м. */
const BLOCK_GAP = 45;
/** Обгонять, только если хочется ехать быстрее хотя бы на столько, м/с. */
const BLOCK_SPEED = 2;
/** Вернуться в свою полосу с таким запасом перед обогнанным, м. */
const RETURN_GAP = 6;
/** Обгон дольше этого не начинать, с. */
const MAX_PASS_TIME = 12;
/** Запас до встречных при решении об обгоне, м. */
const PASS_MARGIN = 40;
/** Прервать обгон, если встреча со встречным ближе этого, с. */
const ABORT_TTC = 2.5;
/** Боковые сдвиги реакций, м: уступить, уйти от игрока, ошибка под дальним светом. */
const YIELD_SHIFT = 0.9;
const EVADE_SHIFT = 1.0;
const WOBBLE_SHIFT = 0.9;
/** Реакции: на гудок — до, на игрока в своей полосе — до, дальний свет — от и до, м. */
const HORN_RANGE = 80;
const EVADE_RANGE = 150;
const GLARE_NEAR = 20;
const GLARE_FAR = 200;

export interface Leader {
  /** Зазор до впереди идущего, м (Infinity — никого). */
  gap: number;
  /** Его скорость по ходу этой машины, м/с (встречный — со знаком минус). */
  speed: number;
  /** Индекс в пуле, PLAYER_TARGET — игрок, −1 — никого. */
  index: number;
  length: number;
  /** Едет в ту же сторону. */
  sameDir: boolean;
}

export const leader: Leader = { gap: Infinity, speed: 0, index: -1, length: 0, sameDir: true };

function overlaps(ax: number, aw: number, bx: number, bw: number): boolean {
  return Math.abs(ax - bx) < (aw + bw) / 2 + LANE_MARGIN;
}

/** Ближайший впереди по ходу машины c среди машин и игрока, перекрывающихся с ней по ширине. */
export function findLeader(t: TrafficState, i: number, player: TrafficPlayer): Leader {
  const c = t.cars[i] as TrafficCar;
  leader.gap = Infinity;
  leader.speed = 0;
  leader.index = -1;
  leader.length = 0;
  leader.sameDir = true;
  for (let j = 0; j < t.cars.length; j++) {
    const o = t.cars[j] as TrafficCar;
    if (j === i || !o.active || !overlaps(o.x, o.width, c.x, c.width)) continue;
    const ahead = (o.z - c.z) * c.dir;
    if (ahead <= 0) continue;
    const g = ahead - (o.length + c.length) / 2;
    if (g < leader.gap) {
      leader.gap = g;
      leader.speed = o.dir === c.dir ? o.speed : -o.speed;
      leader.index = j;
      leader.length = o.length;
      leader.sameDir = o.dir === c.dir;
    }
  }
  if (overlaps(player.x, player.width, c.x, c.width)) {
    const ahead = (player.z - c.z) * c.dir;
    const g = ahead - (player.length + c.length) / 2;
    if (ahead > 0 && g < leader.gap) {
      leader.gap = g;
      leader.speed = c.dir > 0 ? player.speed : -player.speed;
      leader.index = PLAYER_TARGET;
      leader.length = player.length;
      leader.sameDir = c.dir > 0;
    }
  }
  return leader;
}

/** Центр полосы: попутные справа от оси, встречные слева. */
export function laneCenter(dir: number, lane: number, laneWidth: number): number {
  return dir * (lane + 0.5) * laneWidth;
}

/**
 * Свободна ли полоса laneX для машины c на ближайшие T секунд при её скорости v:
 * встречные (и игрок навстречу) дальше, чем сблизимся за T плюс запас; попутные в этой полосе не мешают.
 */
function laneClear(t: TrafficState, i: number, player: TrafficPlayer, laneX: number, laneW: number, v: number, T: number): boolean {
  const c = t.cars[i] as TrafficCar;
  for (let j = 0; j < t.cars.length; j++) {
    const o = t.cars[j] as TrafficCar;
    if (j === i || !o.active || !overlaps(o.x, o.width, laneX, laneW)) continue;
    const ahead = (o.z - c.z) * c.dir;
    if (o.dir !== c.dir) {
      if (ahead > -c.length && ahead < (v + o.speed) * T + PASS_MARGIN) return false;
    } else if (ahead > -c.length - 15 && ahead < v * T + 10) return false;
  }
  if (overlaps(player.x, player.width, laneX, laneW)) {
    const ahead = (player.z - c.z) * c.dir;
    if (c.dir < 0) {
      if (ahead > -c.length && ahead < (v + player.speed) * T + PASS_MARGIN) return false;
    } else if (ahead > -c.length - 30 && ahead < v * T + 10) return false;
  }
  return true;
}

/** Время до встречи со встречным в полосе laneX (Infinity — никого). */
function oncomingTtc(t: TrafficState, i: number, player: TrafficPlayer, laneX: number, laneW: number): number {
  const c = t.cars[i] as TrafficCar;
  let best = Infinity;
  for (let j = 0; j < t.cars.length; j++) {
    const o = t.cars[j] as TrafficCar;
    if (j === i || !o.active || o.dir === c.dir || !overlaps(o.x, o.width, laneX, laneW)) continue;
    const ahead = (o.z - c.z) * c.dir - (o.length + c.length) / 2;
    if (ahead <= 0) continue;
    const ttc = ahead / Math.max(0.5, c.speed + o.speed);
    if (ttc < best) best = ttc;
  }
  if (c.dir < 0 && overlaps(player.x, player.width, laneX, laneW)) {
    const ahead = (player.z - c.z) * c.dir - (player.length + c.length) / 2;
    if (ahead > 0) best = Math.min(best, ahead / Math.max(0.5, c.speed + player.speed));
  }
  return best;
}

function passTime(c: TrafficCar, l: Leader, p: TrafficParams): number {
  const rel = c.cruise * p.overtakeBoost - l.speed;
  return rel <= 0.5 ? Infinity : (l.gap + l.length + c.length + 2 * RETURN_GAP) / rel;
}

/**
 * Решения машины на шаг: фаза обгона, поворотник, реакции на игрока.
 * Возвращает желаемую боковую позицию; desired — множитель желаемой скорости (пишется в aiOut).
 */
export const aiOut = { targetX: 0, speedFactor: 1, maxDecel: 9 };

export function updateAi(t: TrafficState, i: number, l: Leader, p: TrafficParams, player: TrafficPlayer, rng: RngState,
  dt: number): typeof aiOut {
  const c = t.cars[i] as TrafficCar;
  const lw = p.laneWidth;
  const home = laneCenter(c.dir, c.lane, lw);
  const other = laneCenter(-c.dir, 0, lw);
  c.phaseTime += dt;
  c.yieldTime = c.yieldTime > dt ? c.yieldTime - dt : 0;
  c.evadeTime = c.evadeTime > dt ? c.evadeTime - dt : 0;
  c.wobbleTime = c.wobbleTime > dt ? c.wobbleTime - dt : 0;
  c.flashTime = c.flashTime > dt ? c.flashTime - dt : 0;
  aiOut.speedFactor = 1;
  aiOut.maxDecel = 9;

  // Реакции на игрока
  const toPlayer = (player.z - c.z) * c.dir;
  if (c.dir > 0 && player.horn && c.phase === OVERTAKE_NONE && -toPlayer > 0 && -toPlayer < HORN_RANGE
    && overlaps(player.x, player.width, c.x, c.width)) {
    c.yieldTime = 4;
  }
  if (c.dir < 0) {
    // Игрок на нашей полосе: тормозим (не резче комфортного ×1.5 — лобовое возможно), уходим к обочине, моргаем
    if (l.index === PLAYER_TARGET && l.gap < EVADE_RANGE) {
      c.evadeTime = 1.5;
      if (c.flashTime <= 0) c.flashTime = 1;
      aiOut.maxDecel = p.brake * 1.5;
    }
    if (player.glare && toPlayer > GLARE_NEAR && toPlayer < GLARE_FAR) {
      if (!c.flashed) {
        c.flashed = true;
        c.flashTime = 1.2;
      }
      if (c.wobbleTime <= 0 && chance(rng, p.glareChance * dt)) c.wobbleTime = 1.5;
    }
  }

  // Обгон
  switch (c.phase) {
    case OVERTAKE_NONE: {
      c.signal = 0;
      const blocked = l.sameDir && l.gap < BLOCK_GAP && l.speed < c.cruise - BLOCK_SPEED && c.stun <= 0
        && c.yieldTime <= 0 && c.evadeTime <= 0;
      if (blocked && chance(rng, p.overtakeChance * dt)) {
        const T = passTime(c, l, p);
        if (T < MAX_PASS_TIME && laneClear(t, i, player, other, lw * 0.8, c.cruise * p.overtakeBoost, T)) {
          c.phase = OVERTAKE_SIGNAL;
          c.phaseTime = 0;
          c.target = l.index;
          c.signal = -1;
        }
      }
      break;
    }
    case OVERTAKE_SIGNAL: {
      // Поворотник заранее; перед выездом ещё раз смотрим на встречку
      if (c.phaseTime >= p.signalLead) {
        const T = passTime(c, l, p);
        const ok = l.sameDir && T < MAX_PASS_TIME && laneClear(t, i, player, other, lw * 0.8, c.cruise * p.overtakeBoost, T);
        c.phase = ok ? OVERTAKE_PASS : OVERTAKE_NONE;
        c.phaseTime = 0;
        c.signal = ok ? -1 : 0;
      }
      break;
    }
    case OVERTAKE_PASS: {
      aiOut.speedFactor = p.overtakeBoost;
      if (Math.abs(c.x - other) < 0.3) c.signal = 0;
      if (oncomingTtc(t, i, player, other, lw * 0.8) < ABORT_TTC) {
        // Встречный близко — прерываем: возвращаемся, как только рядом в своей полосе есть место
        c.phase = OVERTAKE_ABORT;
        c.phaseTime = 0;
        c.signal = 1;
        aiOut.speedFactor = 0.3;
        break;
      }
      if (passed(t, c, player)) {
        // Впереди в своей полосе ещё машина вплотную — обгоняем и её, иначе возвращаемся
        const next = homeBlocker(t, i, player, home, lw * 0.8);
        if (next === -1) {
          c.phase = OVERTAKE_RETURN;
          c.phaseTime = 0;
          c.signal = 1;
        } else c.target = next;
      }
      break;
    }
    case OVERTAKE_ABORT: {
      // Прерванный обгон: пока своя полоса рядом занята — тормозим, чтобы встать позади
      aiOut.speedFactor = 0.3;
      if (homeBlocker(t, i, player, home, lw * 0.8) === -1) {
        c.phase = OVERTAKE_RETURN;
        c.phaseTime = 0;
      }
      break;
    }
    case OVERTAKE_RETURN: {
      if (Math.abs(c.x - home) < 0.15) {
        c.phase = OVERTAKE_NONE;
        c.signal = 0;
        c.target = -1;
      }
      break;
    }
  }

  let tx = c.phase === OVERTAKE_PASS || c.phase === OVERTAKE_ABORT ? other : home;
  if (c.phase === OVERTAKE_NONE) {
    // Сдвиги к своей обочине (+dir) или к осевой (−dir)
    if (c.yieldTime > 0) {
      tx += c.dir * YIELD_SHIFT;
      aiOut.speedFactor = 0.85;
    }
    if (c.evadeTime > 0) tx += c.dir * EVADE_SHIFT;
    if (c.wobbleTime > 0) tx -= c.dir * WOBBLE_SHIFT;
  }
  aiOut.targetX = tx;
  return aiOut;
}

/** Обогнали цель: она позади с запасом (или исчезла); полоса для возврата свободна. */
function passed(t: TrafficState, c: TrafficCar, player: TrafficPlayer): boolean {
  let tz: number;
  let tl: number;
  if (c.target === PLAYER_TARGET) {
    tz = player.z;
    tl = player.length;
  } else {
    const o = c.target >= 0 ? (t.cars[c.target] as TrafficCar) : null;
    if (!o || !o.active) return true;
    tz = o.z;
    tl = o.length;
  }
  return (c.z - tz) * c.dir > (tl + c.length) / 2 + RETURN_GAP;
}

/** Кто в своей полосе мешает вернуться: машина рядом или чуть впереди (индекс), игрок или −1. */
function homeBlocker(t: TrafficState, i: number, player: TrafficPlayer, home: number, laneW: number): number {
  const c = t.cars[i] as TrafficCar;
  const from = -(c.length / 2 + RETURN_GAP);
  const to = c.length / 2 + RETURN_GAP + 6;
  for (let j = 0; j < t.cars.length; j++) {
    const o = t.cars[j] as TrafficCar;
    if (j === i || !o.active || o.dir !== c.dir || !overlaps(o.x, o.width, home, laneW)) continue;
    const ahead = (o.z - c.z) * c.dir - o.length / 2;
    if (ahead + o.length > from && ahead < to) return j;
  }
  if (c.dir > 0 && overlaps(player.x, player.width, home, laneW)) {
    const ahead = player.z - c.z - player.length / 2;
    if (ahead + player.length > from && ahead < to) return PLAYER_TARGET;
  }
  return -1;
}

/** Плавное боковое смещение к targetX (уход от игрока — быстрее). */
export function moveLateral(c: TrafficCar, targetX: number, p: TrafficParams, halfRoad: number, dt: number): void {
  const step = p.laneChangeSpeed * (c.evadeTime > 0 ? 2 : 1) * dt;
  const d = targetX - c.x;
  c.x += d > step ? step : d < -step ? -step : d;
  const lim = halfRoad - c.width / 2 + 0.3;
  if (c.x > lim) c.x = lim;
  else if (c.x < -lim) c.x = -lim;
}
