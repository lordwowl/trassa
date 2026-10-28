// Поворотники: мигание и самоотключение (после возврата руля из крутого поворота или после перестроения).

export interface SignalState {
  /** −1 — левый, 1 — правый, 0 — выключены. */
  dir: number;
  /** Сколько горит, с (фаза мигания). */
  time: number;
  /** Руль был сильно повёрнут в сторону поворотника — при возврате выключится. */
  armed: boolean;
  /** Смещение машины при включении, м — для отключения после перестроения. */
  startX: number;
}

export interface SignalParams {
  /** Период мигания, с. */
  blinkPeriod: number;
  /** Руль в сторону поворотника больше этого «взводит» самоотключение. */
  armSteer: number;
  /** Сместились в сторону поворотника на столько метров — перестроились. */
  laneChange: number;
}

/** Доля armSteer, ниже которой руль считается вернувшимся. */
const RETURN_FRACTION = 0.3;

export function createSignals(): SignalState {
  return { dir: 0, time: 0, armed: false, startX: 0 };
}

/** Нажатие рычага: та же сторона — выключить, другая — переключить. */
export function toggleSignal(s: SignalState, dir: number, carX: number): void {
  if (s.dir === dir) {
    s.dir = 0;
    return;
  }
  s.dir = dir < 0 ? -1 : 1;
  s.time = 0;
  s.armed = false;
  s.startX = carX;
}

export function stepSignals(s: SignalState, p: SignalParams, dt: number, steer: number, carX: number): void {
  if (s.dir === 0) return;
  s.time += dt;
  const into = steer * s.dir;
  const centered = Math.abs(steer) < p.armSteer * RETURN_FRACTION;
  if (into > p.armSteer) s.armed = true;
  else if (s.armed && centered) s.dir = 0;
  if ((carX - s.startX) * s.dir >= p.laneChange && centered) s.dir = 0;
}

/** Горит ли лампа сейчас (первая половина периода — горит). */
export function signalLit(s: SignalState, blinkPeriod: number): boolean {
  return s.dir !== 0 && s.time % blinkPeriod < blinkPeriod / 2;
}
