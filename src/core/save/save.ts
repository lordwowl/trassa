// Сохранение/загрузка GameState. Хранилище передаётся снаружи (localStorage, Capacitor Preferences),
// все обращения обёрнуты в try/catch: сбой хранилища не должен ронять игру.

import { STATE_VERSION, type GameState } from '../state';
import { isWeather } from '../types';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = 'trassa.save';

/** Миграции: ключ — версия, из которой мигрируем. Каждая поднимает версию на 1. */
const MIGRATIONS: Record<number, (s: Record<string, unknown>) => Record<string, unknown>> = {
  // v2: повреждения машины (M3.2)
  1: (s) => ({ ...s, version: 2, damage: 0 }),
};

export function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  let s = raw;
  while (typeof s.version === 'number' && s.version < STATE_VERSION) {
    const m = MIGRATIONS[s.version];
    if (!m) throw new Error(`save: нет миграции с версии ${s.version}`);
    s = m(s);
  }
  return s;
}

export function isGameState(v: unknown): v is GameState {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  const rng = s.rng as Record<string, unknown> | null;
  return (
    s.version === STATE_VERSION &&
    typeof s.seed === 'number' &&
    typeof rng === 'object' && rng !== null && typeof rng.s === 'number' &&
    typeof s.carId === 'string' &&
    Number.isInteger(s.money) &&
    typeof s.fuel === 'number' &&
    typeof s.timeOfDay === 'number' &&
    typeof s.damage === 'number' &&
    isWeather(s.weather)
  );
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

/** Разбор сохранения. null — если данные битые или из будущей версии. */
export function deserialize(text: string): GameState | null {
  try {
    const raw: unknown = JSON.parse(text);
    if (typeof raw !== 'object' || raw === null) return null;
    const migrated = migrate(raw as Record<string, unknown>);
    return isGameState(migrated) ? migrated : null;
  } catch {
    return null;
  }
}

export function saveGame(storage: KeyValueStorage, state: GameState): boolean {
  try {
    storage.setItem(SAVE_KEY, serialize(state));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(storage: KeyValueStorage): GameState | null {
  try {
    const text = storage.getItem(SAVE_KEY);
    return text ? deserialize(text) : null;
  } catch {
    return null;
  }
}
