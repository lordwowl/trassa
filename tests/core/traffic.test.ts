import { describe, expect, it } from 'vitest';
import { addSection, createDraft, type Road } from '../../src/core/road';
import {
  createTraffic, kindWeights, parseTrafficKinds, populateTraffic, stepTraffic,
  type TrafficCar, type TrafficParams, type TrafficPlayer, type TrafficState,
} from '../../src/core/traffic';
import data from '../../src/data/traffic.json';

const kinds = parseTrafficKinds(data);
const weights = kindWeights(kinds);
const P: TrafficParams = {
  density: 3, oncomingDensity: 2, spawnAhead: 1200, despawnBehind: 300,
  headway: 1.2, minGap: 4, accel: 1.5, brake: 3, speedScale: 1, laneWidth: 3.5,
};

function road(): Road {
  const d = createDraft();
  addSection(d, { enter: 0, hold: 2000, leave: 0, curve: 0, dy: 0, lanes: 2 });
  return { segments: d.segments, segmentLength: 5, length: 10000 };
}

function active(t: TrafficState): TrafficCar[] {
  return t.cars.filter((c) => c.active);
}

function run(t: TrafficState, player: TrafficPlayer, seconds: number, onStep?: () => void): void {
  const r = road();
  for (let i = 0; i < seconds * 60; i++) {
    player.z += player.speed / 60;
    stepTraffic(t, kinds, weights, P, r, player, 1 / 60);
    onStep?.();
  }
}

/** Минимальный зазор между соседями в одной полосе одного направления. */
function minGap(t: TrafficState): number {
  const cars = active(t);
  let g = Infinity;
  for (const a of cars) {
    for (const b of cars) {
      if (a === b || a.dir !== b.dir || a.lane !== b.lane) continue;
      const d = Math.abs(a.z - b.z) - (a.length + b.length) / 2;
      if (d < g) g = d;
    }
  }
  return g;
}

describe('traffic.json', () => {
  it('разбирается и проверяется', () => {
    expect(kinds.map((k) => k.id)).toEqual(['car', 'truck', 'bus']);
    expect(() => parseTrafficKinds({ kinds: [] })).toThrow(/kinds/);
    expect(() => parseTrafficKinds({ kinds: [{ id: 'x', length: 1, width: 1, height: 1, speedMin: 5, speedMax: 2, weight: 1, mass: 1 }] })).toThrow(/speedMin/);
  });
});

describe('трафик', () => {
  it('начальное заполнение: попутные справа, встречные слева, не вплотную к игроку', () => {
    const t = createTraffic(32, 1);
    populateTraffic(t, kinds, weights, P, road(), 0);
    const cars = active(t);
    expect(cars.filter((c) => c.dir > 0).length).toBeGreaterThan(2);
    expect(cars.filter((c) => c.dir < 0).length).toBeGreaterThan(1);
    for (const c of cars) {
      expect(Math.sign(c.x)).toBe(c.dir);
      expect(c.z).toBeGreaterThan(40);
    }
  });

  it('одинаковый seed — одинаковый поток', () => {
    const a = createTraffic(32, 7);
    const b = createTraffic(32, 7);
    const pa = { z: 0, x: 1.75, speed: 25, length: 4.3 };
    const pb = { ...pa };
    populateTraffic(a, kinds, weights, P, road(), 0);
    populateTraffic(b, kinds, weights, P, road(), 0);
    run(a, pa, 30);
    run(b, pb, 30);
    expect(a.cars).toEqual(b.cars);
  });

  it('встречные едут навстречу и исчезают позади, поток восполняется', () => {
    const t = createTraffic(32, 3);
    const player = { z: 0, x: 1.75, speed: 25, length: 4.3 };
    populateTraffic(t, kinds, weights, P, road(), 0);
    const first = active(t).find((c) => c.dir < 0)!;
    const z0 = first.z;
    run(t, player, 1);
    expect(first.z).toBeLessThan(z0);
    run(t, player, 120);
    const cars = active(t);
    expect(cars.filter((c) => c.dir < 0).length).toBeGreaterThan(0);
    for (const c of cars) expect(c.z - player.z).toBeGreaterThan(-P.despawnBehind);
  });

  it('машины не въезжают друг в друга', () => {
    const t = createTraffic(32, 11);
    const player = { z: 0, x: -1.75, speed: 30, length: 4.3 }; // игрок на встречке не мешает попутным
    populateTraffic(t, kinds, weights, P, road(), 0);
    let worst = Infinity;
    run(t, player, 180, () => {
      worst = Math.min(worst, minGap(t));
    });
    expect(worst).toBeGreaterThan(0);
  });

  it('попутная сзади тормозит перед стоящим игроком', () => {
    const t = createTraffic(4, 5);
    const c = t.cars[0]!;
    Object.assign(c, { active: true, kind: 0, dir: 1, lane: 0, z: -150, x: 1.75, speed: 25, cruise: 25, length: 4.3, width: 1.75 });
    const player = { z: 0, x: 1.75, speed: 0, length: 4.3 };
    const r = road();
    let gap = Infinity;
    for (let i = 0; i < 60 * 30; i++) {
      stepTraffic(t, kinds, weights, { ...P, density: 0, oncomingDensity: 0 }, r, player, 1 / 60);
      gap = Math.min(gap, player.z - c.z - 4.3);
    }
    expect(gap).toBeGreaterThan(1);
    expect(c.speed).toBeLessThan(0.5);
  });
});
