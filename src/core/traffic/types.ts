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
}

/** Игрок — препятствие для попутных машин позади. */
export interface TrafficPlayer {
  z: number;
  x: number;
  speed: number;
  length: number;
}
