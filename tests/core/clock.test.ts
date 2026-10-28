import { describe, expect, it } from 'vitest';
import { advanceClock, daylight, formatClock, twilight } from '../../src/core/world';

describe('часы', () => {
  it('идут со скоростью timeSpeed и переходят через полночь', () => {
    expect(advanceClock(12, 60, 30)).toBeCloseTo(12.5);
    expect(advanceClock(23.9, 3600, 1)).toBeCloseTo(0.9);
    expect(advanceClock(0, 0, 30)).toBe(0);
  });

  it('формат ЧЧ:ММ', () => {
    expect(formatClock(9.5)).toBe('09:30');
    expect(formatClock(23.999)).toBe('23:59');
    expect(formatClock(24)).toBe('00:00');
  });
});

describe('освещённость', () => {
  it('день — 1, ночь — 0, рассвет между', () => {
    expect(daylight(12)).toBe(1);
    expect(daylight(2)).toBe(0);
    expect(daylight(23)).toBe(0);
    expect(daylight(6)).toBeGreaterThan(0.2);
    expect(daylight(6)).toBeLessThan(0.8);
  });

  it('рассвет монотонно светлеет, закат темнеет', () => {
    for (let h = 5; h < 7; h += 0.1) expect(daylight(h + 0.1)).toBeGreaterThanOrEqual(daylight(h));
    for (let h = 18; h < 20.5; h += 0.1) expect(daylight(h + 0.1)).toBeLessThanOrEqual(daylight(h));
  });

  it('«золотой час» только на рассвете и закате', () => {
    expect(twilight(12)).toBe(0);
    expect(twilight(0)).toBe(0);
    expect(twilight(19.25)).toBeGreaterThan(0.8);
  });
});
