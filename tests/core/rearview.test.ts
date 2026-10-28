import { describe, expect, it } from 'vitest';
import { addSection, collectBehind, createBehindSegments, createDraft, type Road } from '../../src/core/road';

function road(curve: number, dy = 0): Road {
  const d = createDraft();
  addSection(d, { enter: 0, hold: 100, leave: 0, curve, dy, lanes: 2 });
  return { segments: d.segments, segmentLength: 5, length: 500 };
}

describe('collectBehind', () => {
  it('расстояния растут назад, первый сегмент — неполный', () => {
    const b = collectBehind(createBehindSegments(20), road(0), 102, 10);
    expect(b.count).toBe(10);
    expect(b.dNear[0]).toBe(0);
    expect(b.dFar[0]).toBeCloseTo(2);
    for (let k = 1; k < 10; k++) {
      expect(b.dNear[k]).toBeCloseTo(b.dFar[k - 1]!);
      expect(b.dFar[k]! - b.dNear[k]!).toBeCloseTo(5);
    }
  });

  it('прямая — ось дороги не смещается; правый поворот уходит вправо и позади', () => {
    const straight = collectBehind(createBehindSegments(30), road(0), 250, 30);
    expect(straight.xFar[29]).toBe(0);
    const right = collectBehind(createBehindSegments(30), road(0.01), 250, 30);
    expect(right.xFar[29]!).toBeGreaterThan(5);
    for (let k = 1; k < 30; k++) expect(right.xFar[k]!).toBeGreaterThanOrEqual(right.xFar[k - 1]!);
    const left = collectBehind(createBehindSegments(30), road(-0.01), 250, 30);
    expect(left.xFar[29]!).toBeCloseTo(-right.xFar[29]!);
  });

  it('на подъёме позади дорога ниже машины', () => {
    const b = collectBehind(createBehindSegments(30), road(0, 50), 400, 30);
    expect(b.yFar[29]!).toBeLessThan(b.yNear[0]!);
  });

  it('переход через начало замкнутой трассы и ограничение ёмкостью', () => {
    const b = collectBehind(createBehindSegments(8), road(0), 3, 50);
    expect(b.count).toBe(8);
    expect(b.segment[0]).toBe(0);
    expect(b.segment[1]).toBe(99);
  });
});
