import { describe, expect, it } from 'vitest';
import { applyOutcome, crashOutcome, isSevereCrash, towOutcome, type AccidentParams } from '../../src/core/economy';
import { createGameState } from '../../src/core/state';

const P: AccidentParams = {
  headonImpact: 18, costBase: 150, costPerImpact: 10, timeLoss: 1.5,
  towBase: 300, towPerKm: 15, towDistance: 25, towSpeed: 40, towRepairTo: 60,
};

describe('авария и эвакуатор', () => {
  it('экран «авария» только при сильном лобовом', () => {
    expect(isSevereCrash('headon', 25, P)).toBe(true);
    expect(isSevereCrash('headon', 10, P)).toBe(false);
    expect(isSevereCrash('front', 40, P)).toBe(false);
  });

  it('авария: деньги по силе удара, время, повреждения остаются', () => {
    const o = crashOutcome(30.4, 85, P);
    expect(o).toEqual({ kind: 'crash', cost: 454, hours: 1.5, damageAfter: 85 });
    const s = createGameState({ seed: 1, money: 1000, timeOfDay: 23, damage: 85 });
    expect(applyOutcome(s, o)).toBe(454);
    expect(s.money).toBe(546);
    expect(s.timeOfDay).toBeCloseTo(0.5);
    expect(s.damage).toBe(85);
  });

  it('эвакуатор: цена за км, время в пути, аварийный ремонт', () => {
    const o = towOutcome(P);
    expect(o.cost).toBe(675);
    expect(o.hours).toBeCloseTo(0.5 + 25 / 40);
    const s = createGameState({ seed: 1, money: 1000, damage: 100 });
    applyOutcome(s, o);
    expect(s.damage).toBe(60);
    expect(s.money).toBe(325);
  });

  it('денег не хватает — списывается всё, в минус не уходим', () => {
    const s = createGameState({ seed: 1, money: 200, damage: 100 });
    expect(applyOutcome(s, towOutcome(P))).toBe(200);
    expect(s.money).toBe(0);
    expect(Number.isInteger(s.money)).toBe(true);
  });
});
