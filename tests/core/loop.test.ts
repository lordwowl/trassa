import { describe, expect, it } from 'vitest';
import { advance, alpha, createFixedStep } from '../../src/core/loop';

describe('fixed step loop', () => {
  it('накапливает время и тикает фиксированным шагом', () => {
    const loop = createFixedStep(0.1, 10);
    let ticks = 0;
    expect(advance(loop, 0.05, () => ticks++)).toBe(0);
    expect(advance(loop, 0.06, () => ticks++)).toBe(1);
    expect(ticks).toBe(1);
    expect(alpha(loop)).toBeCloseTo(0.1, 5);
  });

  it('ограничивает число шагов за кадр и сбрасывает долг', () => {
    const loop = createFixedStep(0.1, 3);
    expect(advance(loop, 5, () => {})).toBe(3);
    expect(loop.acc).toBe(0);
  });

  it('игнорирует отрицательный dt', () => {
    const loop = createFixedStep(0.1, 3);
    expect(advance(loop, -1, () => {})).toBe(0);
    expect(loop.acc).toBe(0);
  });
});
