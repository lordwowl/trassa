import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { decorateRoad, generateRoad, type RoadsideParams } from '../../src/core/road';

const gen = { segmentLength: 5, length: 4000, curveMax: 0.008, hillMax: 20, maxGrade: 0.1, lanes: 2 };
const params: RoadsideParams = { laneWidth: 3.5, treeDensity: 6, treeMinOffset: 4, treeMaxOffset: 30, poleSpacing: 50, poleOffset: 2.5, signSpacing: 800 };

function decorated(seed: number, p = params) {
  const road = generateRoad(createRng(1), gen);
  decorateRoad(road, createRng(seed), p);
  return road;
}

describe('decorateRoad', () => {
  it('детерминирован по seed и не меняет геометрию', () => {
    const plain = generateRoad(createRng(1), gen);
    const a = decorated(5);
    const b = decorated(5);
    expect(a).toEqual(b);
    expect(a.segments.map((s) => [s.curve, s.y])).toEqual(plain.segments.map((s) => [s.curve, s.y]));
    expect(decorated(6).segments).not.toEqual(a.segments);
  });

  it('деревья не на полотне и в пределах отступов, с обеих сторон', () => {
    const road = decorated(7);
    const half = 3.5;
    let left = 0;
    let right = 0;
    for (const s of road.segments) {
      for (const o of s.objects ?? []) {
        if (o.kind !== 'tree' && o.kind !== 'tree_round') continue;
        const d = Math.abs(o.x) - half;
        expect(d).toBeGreaterThanOrEqual(params.treeMinOffset);
        expect(d).toBeLessThanOrEqual(params.treeMaxOffset);
        if (o.x < 0) left++;
        else right++;
      }
    }
    // ожидаемо ~6 на 100 м с каждой стороны: 4 км → ~240
    expect(left).toBeGreaterThan(150);
    expect(right).toBeGreaterThan(150);
  });

  it('столбы справа с заданным шагом', () => {
    const road = decorated(8);
    const idx: number[] = [];
    road.segments.forEach((s, i) => {
      if (s.objects?.some((o) => o.kind === 'pole')) idx.push(i);
    });
    expect(idx.length).toBeGreaterThan(70);
    for (let k = 1; k < idx.length; k++) expect(idx[k]! - idx[k - 1]!).toBe(10);
    for (const s of road.segments) for (const o of s.objects ?? []) if (o.kind === 'pole') expect(o.x).toBeCloseTo(6);
  });

  it('нулевые параметры — без столбов, знаков и деревьев', () => {
    const road = decorated(9, { ...params, treeDensity: 0, poleSpacing: 0, signSpacing: 0 });
    expect(road.segments.every((s) => !s.objects)).toBe(true);
  });

  it('повторная расстановка заменяет объекты, а не добавляет', () => {
    const road = decorated(10);
    const count = road.segments.reduce((n, s) => n + (s.objects?.length ?? 0), 0);
    decorateRoad(road, createRng(10), params);
    expect(road.segments.reduce((n, s) => n + (s.objects?.length ?? 0), 0)).toBe(count);
  });
});
