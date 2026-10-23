import { describe, expect, it } from 'vitest';
import { chance, createRng, hashSeed, int, next, pick, range, weightedIndex } from '../../src/core/rng';

describe('rng', () => {
  it('одинаковый seed даёт одинаковую последовательность', () => {
    const a = createRng(123);
    const b = createRng(123);
    for (let i = 0; i < 100; i++) expect(next(a)).toBe(next(b));
  });

  it('разные seed дают разные последовательности', () => {
    const a = createRng(1);
    const b = createRng(2);
    const sa = Array.from({ length: 5 }, () => next(a));
    const sb = Array.from({ length: 5 }, () => next(b));
    expect(sa).not.toEqual(sb);
  });

  it('next в [0, 1)', () => {
    const r = createRng(42);
    for (let i = 0; i < 10000; i++) {
      const v = next(r);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('состояние сериализуемо: продолжение после JSON совпадает', () => {
    const a = createRng(7);
    next(a);
    next(a);
    const b = JSON.parse(JSON.stringify(a));
    expect(next(b)).toBe(next(a));
  });

  it('int покрывает границы включительно', () => {
    const r = createRng(5);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(int(r, 1, 6));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('range, chance, pick', () => {
    const r = createRng(9);
    for (let i = 0; i < 100; i++) {
      const v = range(r, -2, 3);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThan(3);
    }
    expect(chance(r, 0)).toBe(false);
    expect(chance(r, 1)).toBe(true);
    expect(['a', 'b']).toContain(pick(r, ['a', 'b']));
    expect(() => pick(r, [])).toThrow();
  });

  it('weightedIndex не выбирает нулевые веса и примерно соблюдает пропорции', () => {
    const r = createRng(11);
    const counts = [0, 0, 0];
    for (let i = 0; i < 10000; i++) counts[weightedIndex(r, [1, 0, 3])]!++;
    expect(counts[1]).toBe(0);
    expect(counts[2]! / counts[0]!).toBeGreaterThan(2.5);
    expect(counts[2]! / counts[0]!).toBeLessThan(3.5);
    expect(() => weightedIndex(r, [0, 0])).toThrow();
  });

  it('hashSeed стабилен', () => {
    expect(hashSeed('trassa')).toBe(hashSeed('trassa'));
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });
});
