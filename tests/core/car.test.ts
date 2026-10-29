import { describe, expect, it } from 'vitest';
import rawTuning from '../../src/data/tuning.json';
import { createCarParams, createCarState, readRoadContext, stepCar, type CarInput, type RoadContext } from '../../src/core/car';
import { createRng } from '../../src/core/rng';
import { addSection, createDraft, generateRoad } from '../../src/core/road';
import { createTuning, parseTuningData } from '../../src/core/tuning';

const params = createCarParams(createTuning(parseTuningData(rawTuning)));
const DT = 1 / 60;
const flat: RoadContext = { curve: 0, grade: 0, halfWidth: 3.5, grip: 1 };
const GAS: CarInput = { throttle: 1, brake: 0, steer: 0, manual: false, shift: 0 };
const COAST: CarInput = { throttle: 0, brake: 0, steer: 0, manual: false, shift: 0 };

function run(seconds: number, input: CarInput, road = flat, car = createCarState()) {
  for (let i = 0; i < Math.round(seconds / DT); i++) stepCar(car, input, params, road, DT);
  return car;
}

describe('продольная динамика', () => {
  it('разгоняется, но не выше макс. скорости', () => {
    const car = run(5, GAS);
    expect(car.speed).toBeGreaterThan(10);
    const fast = run(120, GAS);
    expect(fast.speed).toBeLessThanOrEqual(params.maxSpeed);
    expect(fast.speed).toBeGreaterThan(params.maxSpeed * 0.7);
    expect(fast.z).toBeGreaterThan(0);
  });

  it('разгон затухает к макс. скорости', () => {
    const car = createCarState();
    stepCar(car, GAS, params, flat, DT);
    const early = car.speed;
    car.speed = params.maxSpeed * 0.8;
    const before = car.speed;
    stepCar(car, GAS, params, flat, DT);
    expect(car.speed - before).toBeLessThan(early);
  });

  it('тормоз останавливает и не уводит скорость в минус', () => {
    const car = run(10, GAS);
    run(10, { throttle: 0, brake: 1, steer: 0, manual: false, shift: 0 }, flat, car);
    expect(car.speed).toBe(0);
  });

  it('без газа машина замедляется', () => {
    const car = run(10, GAS);
    const v = car.speed;
    run(2, COAST, flat, car);
    expect(car.speed).toBeLessThan(v);
  });

  it('в подъём едет медленнее, чем по ровному', () => {
    const uphill = run(8, GAS, { ...flat, grade: 0.08 });
    const level = run(8, GAS);
    expect(uphill.speed).toBeLessThan(level.speed);
  });
});

describe('боковая динамика', () => {
  it('руль не двигает стоящую машину', () => {
    const car = run(1, { throttle: 0, brake: 1, steer: 1, manual: false, shift: 0 });
    expect(car.x).toBe(0);
  });

  it('руль поворачивается плавно, а не мгновенно', () => {
    const car = createCarState();
    stepCar(car, { throttle: 1, brake: 0, steer: 1, manual: false, shift: 0 }, params, flat, DT);
    expect(car.steer).toBeGreaterThan(0);
    expect(car.steer).toBeLessThan(1);
  });

  it('руль вправо смещает машину вправо', () => {
    const car = run(5, GAS);
    run(0.5, { throttle: 1, brake: 0, steer: 1, manual: false, shift: 0 }, flat, car);
    expect(car.x).toBeGreaterThan(0.3);
  });

  it('в правом повороте сносит наружу (влево), руль компенсирует', () => {
    const curve: RoadContext = { ...flat, curve: 0.008 };
    const base = run(6, GAS);
    const drift = run(1, GAS, curve, { ...base });
    expect(drift.x).toBeLessThan(-0.2);
    const held = run(1, { throttle: 1, brake: 0, steer: 0.5, manual: false, shift: 0 }, curve, { ...base });
    expect(held.x).toBeGreaterThan(drift.x);
  });
});

describe('сцепление', () => {
  it('на мокрой дороге тормозной путь длиннее, а снос в повороте сильнее', () => {
    const wet: RoadContext = { ...flat, grip: 0.75 };
    const dryCar = run(8, GAS);
    const wetCar = { ...dryCar };
    const z0 = dryCar.z;
    run(4, { throttle: 0, brake: 1, steer: 0, manual: false, shift: 0 }, flat, dryCar);
    run(4, { throttle: 0, brake: 1, steer: 0, manual: false, shift: 0 }, wet, wetCar);
    expect(wetCar.z - z0).toBeGreaterThan(dryCar.z - z0);
    const base = run(6, GAS);
    const dryDrift = run(1, GAS, { ...flat, curve: 0.008 }, { ...base });
    const wetDrift = run(1, GAS, { ...wet, curve: 0.008 }, { ...base });
    expect(wetDrift.x).toBeLessThan(dryDrift.x);
  });
});

describe('обочина', () => {
  it('за краем полотна — флаг обочины и торможение до предела', () => {
    const car = run(10, GAS);
    car.x = 5;
    run(10, GAS, flat, car);
    expect(car.offroad).toBe(true);
    expect(car.speed).toBeLessThanOrEqual(params.offroadMaxSpeed + 0.5);
  });

  it('дальше лимита за край не уехать', () => {
    const car = run(10, GAS);
    run(10, { throttle: 1, brake: 0, steer: 1, manual: false, shift: 0 }, flat, car);
    expect(car.x).toBeCloseTo(flat.halfWidth + params.offroadLimit);
  });

  it('на полотне — не обочина', () => {
    const car = run(3, GAS);
    expect(car.offroad).toBe(false);
  });
});

describe('readRoadContext', () => {
  it('кривизна, уклон и ширина в точке', () => {
    const d = createDraft();
    addSection(d, { enter: 0, hold: 10, leave: 0, curve: 0.005, dy: 5, lanes: 2 });
    const road = { segments: d.segments, segmentLength: 5, length: 50 };
    const ctx = readRoadContext({ curve: 0, grade: 0, halfWidth: 0, grip: 1 }, road, 22, 3.5);
    expect(ctx.curve).toBe(0.005);
    expect(ctx.grade).toBeCloseTo((d.segments[5]!.y - d.segments[4]!.y) / 5);
    expect(ctx.halfWidth).toBe(3.5);
  });

  it('работает на стыке конца и начала трассы', () => {
    const road = generateRoad(createRng(1), { segmentLength: 5, length: 3000, curveMax: 0.008, hillMax: 20, maxGrade: 0.1, lanes: 2 });
    const ctx = readRoadContext({ curve: 0, grade: 0, halfWidth: 0, grip: 1 }, road, road.length - 1, 3.5);
    expect(Number.isFinite(ctx.grade)).toBe(true);
    expect(Math.abs(ctx.grade)).toBeLessThanOrEqual(0.1 + 1e-9);
  });
});

describe('повреждения', () => {
  function damaged(damage: number) {
    const car = createCarState();
    car.damage = damage;
    return car;
  }

  it('до 30% машина едет прямо, выше — уводит вправо', () => {
    expect(run(5, GAS, flat, damaged(25)).x).toBeCloseTo(0);
    expect(run(5, GAS, flat, damaged(80)).x).toBeGreaterThan(0.2);
  });

  it('выше 60% падает макс. скорость', () => {
    // Широкая дорога: увод не выводит на обочину
    const wide = { ...flat, halfWidth: 1000 };
    const healthy = run(120, GAS, wide).speed;
    const broken = damaged(99);
    broken.speed = healthy;
    run(30, GAS, wide, broken);
    expect(broken.speed).toBeLessThan(healthy * 0.75);
    expect(run(120, GAS, wide, damaged(55)).speed).toBeCloseTo(healthy, 0);
  });

  it('при 100% машина не разгоняется', () => {
    expect(run(5, GAS, flat, damaged(100)).speed).toBe(0);
  });
});
