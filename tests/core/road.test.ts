import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import {
  addSection,
  createDraft,
  easeIn,
  easeInOut,
  focalFromFov,
  generateRoad,
  heightAt,
  project,
  segmentIndexAt,
  wrapZ,
  type RoadGenParams,
} from '../../src/core/road';

const params: RoadGenParams = { segmentLength: 5, length: 8000, curveMax: 0.008, hillMax: 20, maxGrade: 0.1, lanes: 2 };

describe('easing', () => {
  it('границы', () => {
    expect(easeIn(0, 10, 0)).toBe(0);
    expect(easeIn(0, 10, 1)).toBe(10);
    expect(easeInOut(2, 4, 0)).toBeCloseTo(2);
    expect(easeInOut(2, 4, 1)).toBeCloseTo(4);
    expect(easeInOut(0, 1, 0.5)).toBeCloseTo(0.5);
  });
});

describe('addSection', () => {
  it('число сегментов, кривизна на удержании, конечная высота', () => {
    const d = createDraft();
    const segs = d.segments;
    addSection(d, { enter: 10, hold: 20, leave: 10, curve: 0.01, dy: 30, lanes: 2 });
    expect(segs).toHaveLength(40);
    expect(segs[0]!.curve).toBe(0);
    expect(segs[15]!.curve).toBe(0.01);
    // следующий участок начинается ровно с dy
    addSection(d, { enter: 0, hold: 5, leave: 0, curve: 0, dy: 0, lanes: 2 });
    expect(segs[40]!.y).toBeCloseTo(30);
    expect(segs[44]!.y).toBeCloseTo(30);
  });

  it('высота меняется плавно (без скачков)', () => {
    const d = createDraft();
    const segs = d.segments;
    addSection(d, { enter: 0, hold: 100, leave: 0, curve: 0, dy: 20, lanes: 2 });
    for (let i = 1; i < segs.length; i++) expect(Math.abs(segs[i]!.y - segs[i - 1]!.y)).toBeLessThan(0.5);
  });
});

describe('generateRoad', () => {
  it('детерминирован по seed', () => {
    const a = generateRoad(createRng(42), params);
    const b = generateRoad(createRng(42), params);
    const c = generateRoad(createRng(43), params);
    expect(a).toEqual(b);
    expect(a.segments).not.toEqual(c.segments);
  });

  it('длина, пределы кривизны, есть и повороты и холмы', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = generateRoad(createRng(seed), params);
      expect(r.length).toBeGreaterThanOrEqual(params.length);
      expect(r.length).toBe(r.segments.length * params.segmentLength);
      for (const s of r.segments) {
        expect(Math.abs(s.curve)).toBeLessThanOrEqual(params.curveMax + 1e-12);
        expect(s.lanes).toBe(2);
      }
    }
    const r = generateRoad(createRng(7), params);
    expect(r.segments.some((s) => s.curve !== 0)).toBe(true);
    expect(r.segments.some((s) => Math.abs(s.y) > 1)).toBe(true);
  });

  it('трасса замкнута: стартует и заканчивается на высоте 0 прямой', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = generateRoad(createRng(seed), params);
      expect(r.segments[0]!.y).toBe(0);
      const last = r.segments[r.segments.length - 1]!;
      expect(last.y).toBeCloseTo(0, 6);
      expect(last.curve).toBe(0);
      // уклон не больше maxGrade, в том числе на стыке конец → начало
      const maxStep = params.maxGrade * params.segmentLength + 1e-9;
      for (let i = 0; i < r.segments.length; i++) {
        const a = r.segments[i]!.y;
        const b = r.segments[(i + 1) % r.segments.length]!.y;
        expect(Math.abs(b - a)).toBeLessThanOrEqual(maxStep);
      }
    }
  });

  it('ошибка на неверной длине сегмента', () => {
    expect(() => generateRoad(createRng(1), { ...params, segmentLength: 0 })).toThrow();
  });
});

describe('query', () => {
  const road = generateRoad(createRng(3), params);

  it('wrapZ и segmentIndexAt с переходом через конец', () => {
    expect(wrapZ(road, road.length + 7)).toBeCloseTo(7);
    expect(wrapZ(road, -1)).toBeCloseTo(road.length - 1);
    expect(segmentIndexAt(road, 0)).toBe(0);
    expect(segmentIndexAt(road, 12)).toBe(2);
    expect(segmentIndexAt(road, -0.1)).toBe(road.segments.length - 1);
  });

  it('heightAt интерполирует между сегментами', () => {
    const i = 600;
    const a = road.segments[i]!.y;
    const b = road.segments[i + 1]!.y;
    expect(heightAt(road, i * 5)).toBeCloseTo(a);
    expect(heightAt(road, i * 5 + 2.5)).toBeCloseTo((a + b) / 2);
  });
});

describe('projection', () => {
  it('точка на оси уходит в центр/горизонт, масштаб обратно пропорционален глубине', () => {
    const view = { focal: focalFromFov(90, 1280), centerX: 640, horizonY: 360 };
    expect(view.focal).toBeCloseTo(640);
    const out = { x: 0, y: 0, scale: 0 };
    project(out, view, 0, 0, 100);
    expect(out.x).toBe(640);
    expect(out.y).toBe(360);
    project(out, view, 2, -1.2, 10);
    expect(out.scale).toBeCloseTo(64);
    expect(out.x).toBeCloseTo(640 + 128);
    expect(out.y).toBeCloseTo(360 + 76.8);
  });
});
