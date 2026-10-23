// Фиксированный шаг симуляции с аккумулятором.
// Рендер вызывает advance(dt) с реальным временем кадра, симуляция тикает ровно по step.

export interface FixedStep {
  readonly step: number;
  readonly maxSteps: number;
  acc: number;
}

export const SIM_STEP = 1 / 60;

export function createFixedStep(step = SIM_STEP, maxSteps = 5): FixedStep {
  return { step, maxSteps, acc: 0 };
}

/**
 * Накапливает dt (секунды) и вызывает tick нужное число раз.
 * Возвращает число выполненных шагов. При сильном лаге лишнее время отбрасывается,
 * чтобы не уйти в «спираль смерти».
 */
export function advance(loop: FixedStep, dt: number, tick: (step: number) => void): number {
  loop.acc += dt > 0 ? dt : 0;
  let steps = 0;
  while (loop.acc >= loop.step && steps < loop.maxSteps) {
    tick(loop.step);
    loop.acc -= loop.step;
    steps++;
  }
  if (steps === loop.maxSteps && loop.acc >= loop.step) loop.acc = 0;
  return steps;
}

/** Доля до следующего шага [0, 1) — для интерполяции в рендере. */
export function alpha(loop: FixedStep): number {
  return loop.acc / loop.step;
}
