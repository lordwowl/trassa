import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import {
  createWeatherEffects,
  createWindshield,
  dropCoverage,
  fogAmount,
  stepWindshield,
  weatherEffects,
  wiperAngle,
  type WindshieldParams,
} from '../../src/core/world';

const wp = { rainVisibility: 400, heavyVisibility: 200, fogVisibility: 70, snowVisibility: 150, wetGrip: 0.75, snowGrip: 0.55 };

describe('эффекты погоды', () => {
  it('ясно — без дождя, без дымки, сухо', () => {
    const e = weatherEffects(createWeatherEffects(), 'clear', wp);
    expect(e).toEqual({ rain: 0, visibility: Infinity, overcast: 0, grip: 1 });
  });

  it('ливень сильнее дождя, туман — самая короткая видимость, снег — самый скользкий', () => {
    const rain = { ...weatherEffects(createWeatherEffects(), 'rain', wp) };
    const heavy = { ...weatherEffects(createWeatherEffects(), 'heavy_rain', wp) };
    const fog = { ...weatherEffects(createWeatherEffects(), 'fog', wp) };
    const snow = { ...weatherEffects(createWeatherEffects(), 'snow', wp) };
    expect(heavy.rain).toBeGreaterThan(rain.rain);
    expect(heavy.visibility).toBeLessThan(rain.visibility);
    expect(fog.visibility).toBeLessThan(heavy.visibility);
    expect(fog.rain).toBe(0);
    expect(rain.grip).toBe(0.75);
    expect(snow.grip).toBeLessThan(rain.grip);
  });

  it('дымка растёт с расстоянием, на дальности видимости почти полная', () => {
    expect(fogAmount(0, 70)).toBe(0);
    expect(fogAmount(10, Infinity)).toBe(0);
    expect(fogAmount(70, 70)).toBeCloseTo(0.95, 2);
    expect(fogAmount(20, 70)).toBeLessThan(fogAmount(40, 70));
  });
});

const shield: WindshieldParams = {
  width: 1280,
  height: 450,
  dropRate: 40,
  speedFactor: 0.5,
  wiperSweep: 2,
  wiperSlow: 1.6,
  wiperFast: 0.8,
  wipers: [
    { px: 360, py: 470, length: 420, rInner: 30 },
    { px: 800, py: 470, length: 420, rInner: 30 },
  ],
};

function run(seconds: number, rain: number, speed: number, mode: number, w = createWindshield(300), rng = createRng(1)) {
  for (let i = 0; i < Math.round(seconds * 60); i++) stepWindshield(w, shield, rain, speed, mode, rng, 1 / 60);
  return w;
}

describe('стекло и дворники', () => {
  it('без дождя капель нет', () => {
    expect(run(5, 0, 20, 0).count).toBe(0);
  });

  it('в дождь капли копятся, на скорости быстрее, пул не переполняется', () => {
    const still = run(2, 1, 0, 0);
    const fast = run(2, 1, 30, 0);
    expect(still.count).toBeGreaterThan(40);
    expect(fast.count).toBeGreaterThan(still.count);
    expect(run(60, 1, 30, 0).count).toBeLessThanOrEqual(300);
  });

  it('детерминированы по seed', () => {
    const a = run(3, 1, 10, 1, createWindshield(300), createRng(5));
    const b = run(3, 1, 10, 1, createWindshield(300), createRng(5));
    expect(a.count).toBe(b.count);
    expect(Array.from(a.x.slice(0, a.count))).toEqual(Array.from(b.x.slice(0, b.count)));
  });

  it('взмах дворника стирает капли в секторе и не трогает остальные', () => {
    const w = createWindshield(10);
    // капля в секторе левого дворника (над осью), капля вне досягаемости — в углу справа
    w.count = 2;
    w.x[0] = 360; w.y[0] = 200;
    w.x[1] = 1270; w.y[1] = 10;
    for (let i = 0; i < 60; i++) stepWindshield(w, shield, 0, 0, 1, createRng(1), 1 / 60);
    expect(w.count).toBe(1);
    expect(w.x[0]).toBe(1270);
  });

  it('дворники очищают стекло от большей части капель', () => {
    const dirty = run(4, 0.5, 15, 0);
    const wiped = run(4, 0.5, 15, 2);
    expect(dropCoverage(wiped, shield)).toBeLessThan(dropCoverage(dirty, shield));
  });

  it('выключенные дворники доходят до низа и паркуются', () => {
    const w = run(0.3, 0, 0, 1);
    expect(w.angle).toBeGreaterThan(0);
    run(2, 0, 0, 0, w);
    expect(w.phase).toBe(0);
    expect(w.angle).toBe(0);
    expect(wiperAngle(0.5, 2)).toBeCloseTo(2);
  });
});
