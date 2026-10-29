// Общий контекст запуска: конфиг, тюнинг, состояние игры. Создаётся один раз в main.ts.
import type { LaunchConfig } from './config';
import type { GameState } from './core/state';
import type { Tuning } from './core/tuning';

/** Телеметрия для debug-оверлея. Заполняется сценой езды, читается оверлеем. */
export interface DebugInfo {
  scene: string;
  speed: number;
  rpm: number;
  gear: number;
  segment: number;
  x: number;
  /** Машин трафика: попутных и встречных. */
  trafficSame: number;
  trafficOncoming: number;
}

export interface GameContext {
  config: LaunchConfig;
  tuning: Tuning;
  state: GameState;
  debug: DebugInfo;
}

let ctx: GameContext | null = null;

export function setContext(c: GameContext): void {
  ctx = c;
}

export function getContext(): GameContext {
  if (!ctx) throw new Error('GameContext не создан');
  return ctx;
}
