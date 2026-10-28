// Настройки управления игрока (режим руля, калибровка наклона) в localStorage.

export type SteerMode = 'tilt' | 'buttons';
export type Transmission = 'auto' | 'manual';

export interface ControlSettings {
  steerMode: SteerMode;
  /** Угол наклона, принятый за «прямо», градусы. */
  tiltZero: number;
  /** КПП: автомат по умолчанию (GDD 5.1). */
  transmission: Transmission;
}

const KEY = 'trassa.controls';

export function loadControlSettings(): ControlSettings {
  const def: ControlSettings = { steerMode: 'tilt', tiltZero: 0, transmission: 'auto' };
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return def;
    const o = JSON.parse(raw) as Partial<ControlSettings>;
    return {
      steerMode: o.steerMode === 'buttons' ? 'buttons' : 'tilt',
      tiltZero: typeof o.tiltZero === 'number' && Number.isFinite(o.tiltZero) ? o.tiltZero : 0,
      transmission: o.transmission === 'manual' ? 'manual' : 'auto',
    };
  } catch {
    return def;
  }
}

export function saveControlSettings(s: ControlSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // нет хранилища — настройки живут до перезагрузки
  }
}
