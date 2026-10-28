import { describe, expect, it } from 'vitest';
import { gaugeTicks, needleAngle } from '../../src/render/cockpit/gaugeMath';

const deg = (r: number) => (r * 180) / Math.PI;

describe('needleAngle', () => {
  it('0 — в начале шкалы, max — в конце, середина — посередине', () => {
    expect(deg(needleAngle(0, 180, 135, 405))).toBeCloseTo(135);
    expect(deg(needleAngle(180, 180, 135, 405))).toBeCloseTo(405);
    expect(deg(needleAngle(90, 180, 135, 405))).toBeCloseTo(270);
  });

  it('за пределами шкалы стрелка упирается', () => {
    expect(deg(needleAngle(-10, 180, 135, 405))).toBeCloseTo(135);
    expect(deg(needleAngle(500, 180, 135, 405))).toBeCloseTo(405);
  });
});

describe('gaugeTicks', () => {
  it('деления с шагом, включая максимум', () => {
    expect(gaugeTicks(180, 20)).toEqual([0, 20, 40, 60, 80, 100, 120, 140, 160, 180]);
    expect(gaugeTicks(100, 0)).toEqual([]);
  });
});
