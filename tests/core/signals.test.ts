import { describe, expect, it } from 'vitest';
import { createSignals, signalLit, stepSignals, toggleSignal } from '../../src/core/car';

const P = { blinkPeriod: 0.8, armSteer: 0.6, laneChange: 3 };

describe('поворотники', () => {
  it('включение, переключение и выключение тем же рычагом', () => {
    const s = createSignals();
    toggleSignal(s, -1, 0);
    expect(s.dir).toBe(-1);
    toggleSignal(s, 1, 0);
    expect(s.dir).toBe(1);
    toggleSignal(s, 1, 0);
    expect(s.dir).toBe(0);
  });

  it('мигают с заданным периодом, сразу горят', () => {
    const s = createSignals();
    toggleSignal(s, 1, 0);
    expect(signalLit(s, P.blinkPeriod)).toBe(true);
    stepSignals(s, P, 0.5, 0, 0);
    expect(signalLit(s, P.blinkPeriod)).toBe(false);
    stepSignals(s, P, 0.4, 0, 0);
    expect(signalLit(s, P.blinkPeriod)).toBe(true);
    toggleSignal(s, 1, 0);
    expect(signalLit(s, P.blinkPeriod)).toBe(false);
  });

  it('выключаются, когда руль вернулся из крутого поворота в ту же сторону', () => {
    const s = createSignals();
    toggleSignal(s, 1, 0);
    stepSignals(s, P, 0.1, 0.3, 0);
    stepSignals(s, P, 0.1, 0, 0);
    expect(s.dir).toBe(1); // небольшое движение руля не взводит
    stepSignals(s, P, 0.1, 0.8, 0);
    stepSignals(s, P, 0.1, 0.5, 0);
    expect(s.dir).toBe(1);
    stepSignals(s, P, 0.1, 0.05, 0);
    expect(s.dir).toBe(0);
  });

  it('руль в другую сторону не взводит', () => {
    const s = createSignals();
    toggleSignal(s, -1, 0);
    stepSignals(s, P, 0.1, 0.9, 0);
    stepSignals(s, P, 0.1, 0, 0);
    expect(s.dir).toBe(-1);
  });

  it('выключаются после перестроения в сторону поворотника, когда руль выровнен', () => {
    const s = createSignals();
    toggleSignal(s, -1, 1.75);
    stepSignals(s, P, 0.1, -0.3, 0);
    expect(s.dir).toBe(-1);
    stepSignals(s, P, 0.1, -0.3, -1.6); // уже сместились, но руль ещё повёрнут
    expect(s.dir).toBe(-1);
    stepSignals(s, P, 0.1, 0.02, -1.7);
    expect(s.dir).toBe(0);
  });
});
