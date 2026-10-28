import { describe, expect, it } from 'vitest';
import { addSection, createCurveAhead, createDraft, findCurveAhead, type Road } from '../../src/core/road';

function road(): Road {
  const d = createDraft();
  addSection(d, { enter: 0, hold: 40, leave: 0, curve: 0, dy: 0, lanes: 2 }); // 0..200 м прямо
  addSection(d, { enter: 0, hold: 20, leave: 0, curve: 0.004, dy: 0, lanes: 2 }); // 200..300 направо
  addSection(d, { enter: 0, hold: 20, leave: 0, curve: -0.006, dy: 0, lanes: 2 }); // 300..400 налево
  addSection(d, { enter: 0, hold: 20, leave: 0, curve: 0, dy: 0, lanes: 2 }); // 400..500 прямо
  return { segments: d.segments, segmentLength: 5, length: 500 };
}

describe('findCurveAhead', () => {
  it('находит ближайший поворот и расстояние до него', () => {
    const r = findCurveAhead(createCurveAhead(), road(), 52, 800, 0.001);
    expect(r.dir).toBe(1);
    expect(r.distance).toBeCloseTo(148);
    expect(r.strength).toBeCloseTo(0.004);
  });

  it('в повороте — расстояние 0, следующий — после смены знака', () => {
    const out = createCurveAhead();
    expect(findCurveAhead(out, road(), 250, 800, 0.001).distance).toBe(0);
    findCurveAhead(out, road(), 310, 800, 0.001);
    expect(out.dir).toBe(-1);
    expect(out.strength).toBeCloseTo(0.006);
  });

  it('за пределами дальности и слабые изгибы не видны', () => {
    expect(findCurveAhead(createCurveAhead(), road(), 0, 150, 0.001).dir).toBe(0);
    expect(findCurveAhead(createCurveAhead(), road(), 0, 800, 0.01).dir).toBe(0);
  });

  it('трасса замкнута: из конца виден поворот в начале круга', () => {
    const r = findCurveAhead(createCurveAhead(), road(), 450, 300, 0.001);
    expect(r.dir).toBe(1);
    expect(r.distance).toBeCloseTo(250);
  });
});
