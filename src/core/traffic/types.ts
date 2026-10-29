// Трафик: пул машин фиксированного размера (без аллокаций в шаге), только данные.

import type { RngState } from '../rng';

export interface TrafficCar {
  active: boolean;
  /** Индекс вида в списке TrafficKind. */
  kind: number;
  /** Цвет кузова — индекс палитры (рендер берёт по модулю). */
  paint: number;
  /** 1 — попутная, −1 — встречная. */
  dir: number;
  /** Полоса своего направления: 0 — крайняя правая по ходу. */
  lane: number;
  /** Позиция вдоль трассы, м — в той же (незацикленной) координате, что и машина игрока. */
  z: number;
  /** Смещение от центра дороги, м (вправо > 0). */
  x: number;
  /** Скорость, м/с, ≥ 0 (направление — dir). */
  speed: number;
  /** Желаемая скорость, м/с. */
  cruise: number;
  length: number;
  width: number;
  /** После удара стоит столько секунд, потом снова едет, с. */
  stun: number;
  /** Обгон: фаза (OVERTAKE_*), время в фазе, с; кого обгоняет (индекс, PLAYER_TARGET — игрока, −1 — никого). */
  phase: number;
  phaseTime: number;
  target: number;
  /** Поворотник относительно водителя этой машины: −1 левый, 1 правый, 0 — нет. */
  signal: number;
  /** Таймеры реакций, с: уступает (гудок), уходит от игрока на своей полосе, ошибся от слепящего света, моргает фарами. */
  yieldTime: number;
  evadeTime: number;
  wobbleTime: number;
  flashTime: number;
  /** Уже моргнул игроку за дальний свет (один раз за встречу). */
  flashed: boolean;
}

export interface TrafficState {
  cars: TrafficCar[];
  rng: RngState;
  /** До следующей попытки появления, с: [попутные, встречные]. */
  spawnTimer: number[];
}

export interface TrafficParams {
  /** Машин на км в своём направлении и навстречу. */
  density: number;
  oncomingDensity: number;
  /** Окно вокруг игрока: машины появляются на spawnAhead впереди и исчезают за despawnBehind позади, м. */
  spawnAhead: number;
  despawnBehind: number;
  /** ИИ (модель IDM): желаемый интервал, с; минимальный зазор, м; разгон и комфортное торможение, м/с². */
  headway: number;
  minGap: number;
  accel: number;
  brake: number;
  /** Множитель скоростей трафика. */
  speedScale: number;
  laneWidth: number;
  /** Обгон: вероятность решиться за секунду, прибавка скорости, поворотник заранее, с; боковая скорость, м/с. */
  overtakeChance: number;
  overtakeBoost: number;
  signalLead: number;
  laneChangeSpeed: number;
  /** Вероятность ошибки встречного за секунду под дальним светом. */
  glareChance: number;
}

/** Игрок — препятствие для попутных машин позади. */
export interface TrafficPlayer {
  z: number;
  x: number;
  speed: number;
  length: number;
  width: number;
  /** Дальний свет в темноте — слепит встречных. */
  glare: boolean;
  /** Гудок звучит. */
  horn: boolean;
}

/** Фазы обгона. */
export const OVERTAKE_NONE = 0;
export const OVERTAKE_SIGNAL = 1;
export const OVERTAKE_PASS = 2;
export const OVERTAKE_RETURN = 3;
/** Обгон прерван: ждёт места в своей полосе, притормаживая. */
export const OVERTAKE_ABORT = 4;
/** target, когда обгоняют игрока. */
export const PLAYER_TARGET = -2;
