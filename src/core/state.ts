// GameState — единый сериализуемый объект (только данные, без методов и циклов).

import { createRng, type RngState } from './rng';
import type { Weather } from './types';

export const STATE_VERSION = 2;

export interface GameState {
  version: number;
  seed: number;
  rng: RngState;
  carId: string;
  /** Деньги — целые кредиты. */
  money: number;
  /** Топливо, литры. */
  fuel: number;
  /** Время суток, часы [0, 24). */
  timeOfDay: number;
  weather: Weather;
  /** Повреждения машины, % (0..100). */
  damage: number;
}

export interface NewGameOptions {
  seed: number;
  carId?: string | null;
  money?: number | null;
  fuel?: number | null;
  timeOfDay?: number | null;
  weather?: Weather | null;
  damage?: number | null;
}

// Временные стартовые значения M0; в M4–M5 переедут в tuning.json/cars.json.
export const DEFAULT_CAR_ID = 'oldtimer';
const DEFAULT_MONEY = 1000;
const DEFAULT_FUEL = 40;
const DEFAULT_TIME = 12;

export function createGameState(o: NewGameOptions): GameState {
  return {
    version: STATE_VERSION,
    seed: o.seed >>> 0,
    rng: createRng(o.seed),
    carId: o.carId ?? DEFAULT_CAR_ID,
    money: Math.round(o.money ?? DEFAULT_MONEY),
    fuel: o.fuel ?? DEFAULT_FUEL,
    timeOfDay: o.timeOfDay ?? DEFAULT_TIME,
    weather: o.weather ?? 'clear',
    damage: Math.min(100, Math.max(0, o.damage ?? 0)),
  };
}
