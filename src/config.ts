// Базовые настройки и разбор URL-параметров.
// Модуль без обращений к window при импорте — parseLaunchConfig тестируется в node.

import { isWeather, type Weather } from './core/types';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export type StartScene = 'menu' | 'drive' | 'map' | 'city';
const START_SCENES: readonly StartScene[] = ['menu', 'drive', 'map', 'city'];

export interface LaunchConfig {
  debug: boolean;
  scene: StartScene;
  seed: number | null;
  weather: Weather | null;
  /** Время суток в часах [0, 24). */
  time: number | null;
  car: string | null;
  money: number | null;
  fuel: number | null;
  /** Предупреждения о неверных параметрах — показываются в debug-оверлее. */
  warnings: string[];
}

function parseNumber(raw: string | null, name: string, warnings: string[]): number | null {
  if (raw === null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    warnings.push(`${name}: не число «${raw}»`);
    return null;
  }
  return n;
}

export function parseLaunchConfig(search: string): LaunchConfig {
  const p = new URLSearchParams(search);
  const warnings: string[] = [];

  const debugRaw = p.get('debug');
  const debug = debugRaw !== null && debugRaw !== '0' && debugRaw !== 'false';

  let scene: StartScene = 'menu';
  const sceneRaw = p.get('scene');
  if (sceneRaw !== null) {
    if ((START_SCENES as readonly string[]).includes(sceneRaw)) scene = sceneRaw as StartScene;
    else warnings.push(`scene: неизвестная сцена «${sceneRaw}»`);
  }

  let seed = parseNumber(p.get('seed'), 'seed', warnings);
  if (seed !== null) seed = Math.trunc(seed) >>> 0;

  let weather: Weather | null = null;
  const weatherRaw = p.get('weather');
  if (weatherRaw !== null) {
    if (isWeather(weatherRaw)) weather = weatherRaw;
    else warnings.push(`weather: неизвестная погода «${weatherRaw}»`);
  }

  let time = parseNumber(p.get('time'), 'time', warnings);
  if (time !== null && (time < 0 || time >= 24)) {
    warnings.push(`time: вне диапазона 0–24 «${time}»`);
    time = null;
  }

  const carRaw = p.get('car');
  const car = carRaw !== null && carRaw !== '' ? carRaw : null;

  let money = parseNumber(p.get('money'), 'money', warnings);
  if (money !== null) money = Math.round(money); // деньги — целые

  let fuel = parseNumber(p.get('fuel'), 'fuel', warnings);
  if (fuel !== null && fuel < 0) {
    warnings.push(`fuel: отрицательное значение «${fuel}»`);
    fuel = null;
  }

  return { debug, scene, seed, weather, time, car, money, fuel, warnings };
}

let cached: LaunchConfig | null = null;

/** Конфиг текущего запуска (из location.search). */
export function getLaunchConfig(): LaunchConfig {
  if (!cached) cached = parseLaunchConfig(globalThis.location?.search ?? '');
  return cached;
}
