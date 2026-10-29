import { describe, expect, it } from 'vitest';
import { addSection, createDraft, type Road } from '../../src/core/road';
import {
  createTraffic, kindWeights, parseTrafficKinds, populateTraffic, stepTraffic, OVERTAKE_PASS,
  type TrafficCar, type TrafficParams, type TrafficPlayer, type TrafficState,
} from '../../src/core/traffic';
import data from '../../src/data/traffic.json';

const kinds = parseTrafficKinds(data);
const weights = kindWeights(kinds);
const P: TrafficParams = {
  density: 0, oncomingDensity: 0, spawnAhead: 1200, despawnBehind: 300,
  headway: 1.3, minGap: 4, accel: 1.5, brake: 3, speedScale: 1, laneWidth: 3.5,
  overtakeChance: 5, overtakeBoost: 1.2, signalLead: 1.2, laneChangeSpeed: 1.6, glareChance: 0,
};
const DT = 1 / 60;

function road(): Road {
  const d = createDraft();
  addSection(d, { enter: 0, hold: 4000, leave: 0, curve: 0, dy: 0, lanes: 2 });
  return { segments: d.segments, segmentLength: 5, length: 20000 };
}

function pl(z: number, x: number, speed: number): TrafficPlayer {
  return { z, x, speed, length: 4.3, width: 1.75, glare: false, horn: false };
}

function put(t: TrafficState, i: number, o: Partial<TrafficCar>): TrafficCar {
  const c = t.cars[i]!;
  const kind = o.kind ?? 0;
  const k = kinds[kind]!;
  Object.assign(c, { active: true, kind, paint: 0, dir: 1, lane: 0, x: 1.75, length: k.length, width: k.width, stun: 0, ...o });
  if (o.cruise === undefined) c.cruise = c.speed;
  return c;
}

function run(t: TrafficState, player: TrafficPlayer, seconds: number, p = P, each?: () => void): void {
  const r = road();
  for (let i = 0; i < seconds / DT; i++) {
    player.z += player.speed * DT;
    stepTraffic(t, kinds, weights, p, r, player, DT);
    each?.();
  }
}

describe('ИИ трафика: обгоны', () => {
  it('обгоняет медленный грузовик по свободной встречке: поворотник, выезд, возврат', () => {
    const t = createTraffic(8, 1);
    const car = put(t, 0, { z: 1000, speed: 26 });
    const truck = put(t, 1, { kind: 1, z: 1040, speed: 14 });
    const player = pl(900, 1.75, 24); // позади, не мешает
    let signalBeforeMove = Infinity;
    let minX = Infinity;
    run(t, player, 40, P, () => {
      if (car.signal === -1 && car.x > 1.7) signalBeforeMove = Math.min(signalBeforeMove, car.phaseTime);
      minX = Math.min(minX, car.x);
    });
    expect(minX).toBeLessThan(-1.5); // был на встречной полосе
    expect(car.z).toBeGreaterThan(truck.z + 10);
    expect(car.x).toBeCloseTo(1.75, 1);
    expect(car.signal).toBe(0);
  });

  it('не выезжает, пока близко встречная', () => {
    const t = createTraffic(8, 2);
    const car = put(t, 0, { z: 1000, speed: 26 });
    put(t, 1, { kind: 1, z: 1035, speed: 14 });
    put(t, 2, { z: 1150, speed: 20, dir: -1, x: -1.75 });
    const player = pl(0, 1.75, 0);
    let maxOut = -Infinity;
    run(t, player, 3, P, () => {
      maxOut = Math.max(maxOut, -car.x);
    });
    expect(maxOut).toBeLessThan(0);
  });

  it('обгоняет медленного игрока в правой полосе', () => {
    const t = createTraffic(8, 3);
    const car = put(t, 0, { z: 940, speed: 25 });
    const player = pl(1000, 1.75, 10);
    run(t, player, 30);
    expect(car.z).toBeGreaterThan(player.z + 5);
    expect(car.x).toBeGreaterThan(1);
  });

  it('встречная прерывает обгон, когда навстречу игрок, и встаёт за обгоняемым', () => {
    const t = createTraffic(8, 4);
    const car = put(t, 0, { z: 1000, speed: 26, dir: -1, x: -1.75 });
    const truck = put(t, 1, { kind: 1, z: 965, speed: 12, dir: -1, x: -1.75 });
    const player = pl(0, 1.75, 0);
    run(t, player, 4); // выехала на нашу полосу
    expect(car.phase).toBe(OVERTAKE_PASS);
    expect(car.x).toBeGreaterThan(0);
    // Игрок появляется впереди неё на своей полосе
    Object.assign(player, pl(car.z - 110, 1.75, 22));
    let minGap = Infinity;
    let truckOverlap = false;
    let xWhenMeeting = NaN;
    run(t, player, 8, P, () => {
      if (Math.abs(car.x - player.x) < 1.9 && player.z < car.z) minGap = Math.min(minGap, car.z - player.z - 4.3);
      if (Math.abs(car.x - truck.x) < 2.1 && Math.abs(car.z - truck.z) < 8.2) truckOverlap = true;
      if (Number.isNaN(xWhenMeeting) && player.z >= car.z) xWhenMeeting = car.x;
    });
    // Разъехались: в момент встречи она уже в своей полосе
    expect(xWhenMeeting).toBeLessThan(-1);
    expect(minGap).toBeGreaterThan(0);
    expect(truckOverlap).toBe(false);
  });

  it('плотный поток с обгонами — машины не налезают друг на друга', () => {
    const t = createTraffic(32, 9);
    const player = pl(0, 1.75, 24);
    const p = { ...P, density: 4, oncomingDensity: 3, overtakeChance: 0.5 };
    populateTraffic(t, kinds, weights, p, road(), 0);
    let overlaps = 0;
    run(t, player, 240, p, () => {
      const cars = t.cars.filter((c) => c.active);
      for (const a of cars) {
        for (const b of cars) {
          if (a === b) continue;
          const dz = Math.abs(a.z - b.z) - (a.length + b.length) / 2;
          const dx = Math.abs(a.x - b.x) - (a.width + b.width) / 2;
          if (dz < 0 && dx < 0) overlaps++;
        }
      }
    });
    expect(overlaps).toBe(0);
  });
});

describe('ИИ трафика: реакции на игрока', () => {
  it('гудок: попутная впереди уступает — уходит к обочине', () => {
    const t = createTraffic(4, 5);
    const car = put(t, 0, { z: 40, speed: 18 });
    const player = pl(0, 1.75, 18);
    player.horn = true;
    run(t, player, 1.5);
    expect(car.x).toBeGreaterThan(2.3);
    expect(car.yieldTime).toBeGreaterThan(0);
  });

  it('встречная тормозит и уходит к обочине, когда игрок на её полосе', () => {
    const t = createTraffic(4, 6);
    const car = put(t, 0, { z: 200, speed: 22, dir: -1, x: -1.75 });
    const player = pl(0, -1.75, 22);
    run(t, player, 1.5);
    expect(car.speed).toBeLessThan(20);
    expect(car.x).toBeLessThan(-2.3);
    expect(car.flashTime).toBeGreaterThan(0);
  });

  it('дальний свет: встречная моргает в ответ, иногда ошибается', () => {
    const t = createTraffic(4, 7);
    const car = put(t, 0, { z: 150, speed: 20, dir: -1, x: -1.75 });
    const player = pl(0, 1.75, 20);
    player.glare = true;
    let wobbled = false;
    run(t, player, 2.5, { ...P, glareChance: 3 }, () => {
      if (car.wobbleTime > 0) wobbled = true;
    });
    expect(car.flashed).toBe(true);
    expect(wobbled).toBe(true);
  });
});
