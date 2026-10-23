import { describe, expect, it } from 'vitest';
import rawTuning from '../../src/data/tuning.json';
import {
  createTuning,
  exportTuningJson,
  getTuning,
  parseOverrides,
  parseTuningData,
  setTuningValue,
  tuningOverrides,
} from '../../src/core/tuning';

const data = parseTuningData(rawTuning);

describe('tuning', () => {
  it('tuning.json проходит проверку, значения внутри диапазонов', () => {
    for (const p of Object.values(data.params)) {
      expect(p.value).toBeGreaterThanOrEqual(p.min);
      expect(p.value).toBeLessThanOrEqual(p.max);
    }
  });

  it('понятные ошибки на битых данных', () => {
    expect(() => parseTuningData(null)).toThrow(/объект/);
    expect(() => parseTuningData({ version: 1, params: { a: { value: 'x', min: 0, max: 1, step: 1 } } })).toThrow(/a.value/);
    expect(() => parseTuningData({ version: 1, params: { a: { value: 0, min: 2, max: 1, step: 1 } } })).toThrow(/min > max/);
  });

  it('переопределения ограничиваются диапазоном и экспортируются', () => {
    const t = createTuning(data, { 'car.maxSpeed': 9999, unknown: 1 });
    expect(getTuning(t, 'car.maxSpeed')).toBe(data.params['car.maxSpeed']!.max);
    expect(tuningOverrides(t)).toEqual({ 'car.maxSpeed': data.params['car.maxSpeed']!.max });
    expect(setTuningValue(t, 'nope', 1)).toBe(false);
    expect(() => getTuning(t, 'nope')).toThrow();

    const exported = parseTuningData(JSON.parse(exportTuningJson(t)));
    expect(exported.params['car.maxSpeed']!.value).toBe(data.params['car.maxSpeed']!.max);
    expect(exported.params['road.fieldOfView']).toEqual(data.params['road.fieldOfView']);
  });

  it('parseOverrides терпит мусор', () => {
    expect(parseOverrides(null)).toEqual({});
    expect(parseOverrides('{oops')).toEqual({});
    expect(parseOverrides('{"a":1,"b":"x"}')).toEqual({ a: 1 });
  });
});
