import { describe, expect, it } from 'vitest';
import rawTuning from '../../src/data/tuning.json';
import { createCarParams, createCarState, gearTopSpeed, rpmRatio, stepCar, torqueCurve, type CarInput, type RoadContext } from '../../src/core/car';
import { createTuning, parseTuningData } from '../../src/core/tuning';

const p = createCarParams(createTuning(parseTuningData(rawTuning)));
const DT = 1 / 60;
const flat: RoadContext = { curve: 0, grade: 0, halfWidth: 3.5 };
const input = (o: Partial<CarInput> = {}): CarInput => ({ throttle: 0, brake: 0, steer: 0, manual: false, shift: 0, ...o });

function run(seconds: number, inp: CarInput, car = createCarState()) {
  for (let i = 0; i < Math.round(seconds / DT); i++) stepCar(car, inp, p, flat, DT);
  return car;
}

describe('кривая момента и обороты', () => {
  it('момент максимален в середине и пропадает на отсечке', () => {
    expect(torqueCurve(0.5)).toBeCloseTo(1);
    expect(torqueCurve(0)).toBeCloseTo(0.7);
    expect(torqueCurve(1)).toBe(0);
    expect(torqueCurve(1.2)).toBe(0);
  });

  it('скорости передач растут, доля оборотов падает на высшей', () => {
    for (let g = 2; g <= p.gearCount; g++) expect(gearTopSpeed(p, g)).toBeGreaterThan(gearTopSpeed(p, g - 1));
    expect(rpmRatio(p, 10, 1)).toBeGreaterThan(rpmRatio(p, 10, 2));
  });

  it('на стоянке без газа — холостые обороты', () => {
    const car = run(1, input());
    expect(car.rpm).toBeCloseTo(p.idleRpm);
    expect(car.gear).toBe(1);
  });
});

describe('автомат', () => {
  it('на скорости выше отсечки сразу повышает передачу и без газа', () => {
    const car = createCarState();
    car.speed = 25;
    run(2, input(), car);
    expect(rpmRatio(p, car.speed, car.gear)).toBeLessThanOrEqual(1.02);
  });

  it('при разгоне повышает передачи до высшей, не выходя за пределы', () => {
    const car = createCarState();
    const inp = input({ throttle: 1 });
    let maxGear = 1;
    let prev = 1;
    for (let i = 0; i < 60 * 60; i++) {
      stepCar(car, inp, p, flat, DT);
      expect(car.gear).toBeGreaterThanOrEqual(prev);
      prev = car.gear;
      maxGear = Math.max(maxGear, car.gear);
      expect(car.rpm).toBeLessThanOrEqual(p.redline * 1.1 + 1);
    }
    expect(maxGear).toBe(p.gearCount);
  });

  it('при торможении понижает передачи до первой', () => {
    const car = run(30, input({ throttle: 1 }));
    run(15, input({ brake: 1 }), car);
    expect(car.speed).toBe(0);
    expect(car.gear).toBe(1);
  });

  it('«Старичок»: 0–100 примерно за 8–13 с, предел 110–140 км/ч', () => {
    const car = createCarState();
    const inp = input({ throttle: 1 });
    let t100 = -1;
    for (let i = 0; i < 60 * 90; i++) {
      stepCar(car, inp, p, flat, DT);
      if (t100 < 0 && car.speed * 3.6 >= 100) t100 = i * DT;
    }
    expect(t100).toBeGreaterThan(8);
    expect(t100).toBeLessThan(13);
    expect(car.speed * 3.6).toBeGreaterThan(110);
    expect(car.speed * 3.6).toBeLessThan(140);
  });
});

describe('механика', () => {
  it('без переключений упирается в отсечку первой передачи и копит перекрут', () => {
    const car = run(10, input({ throttle: 1, manual: true }));
    expect(car.gear).toBe(1);
    expect(car.speed).toBeLessThanOrEqual(gearTopSpeed(p, 1) * 1.01);
    expect(car.rpm).toBeGreaterThan(p.redline * 0.95);
  });

  it('переключение по запросу, запрос сбрасывается, границы соблюдаются', () => {
    const car = createCarState();
    const inp = input({ manual: true, shift: -1 });
    stepCar(car, inp, p, flat, DT);
    expect(car.gear).toBe(1);
    expect(inp.shift).toBe(0);
    inp.shift = 1;
    stepCar(car, inp, p, flat, DT);
    expect(car.gear).toBe(2);
    // запрос во время переключения ждёт его окончания
    inp.shift = 1;
    stepCar(car, inp, p, flat, DT);
    expect(car.gear).toBe(2);
    expect(inp.shift).toBe(1);
    run(p.shiftTime + 0.05, inp, car);
    expect(car.gear).toBe(3);
    expect(inp.shift).toBe(0);
    for (let i = 0; i < 10; i++) {
      run(1, input({ manual: true }), car);
      inp.shift = 1;
      stepCar(car, inp, p, flat, DT);
    }
    expect(car.gear).toBe(p.gearCount);
  });

  it('понижение на скорости — перекрут и торможение двигателем', () => {
    const car = run(25, input({ throttle: 1 }));
    expect(car.gear).toBeGreaterThan(2);
    const v = car.speed;
    const inp = input({ manual: true, throttle: 0 });
    for (let i = 0; i < 3; i++) {
      inp.shift = -1;
      run(0.4, inp, car);
    }
    expect(car.overRevTime).toBeGreaterThan(0);
    expect(car.speed).toBeLessThan(v);
  });
});
