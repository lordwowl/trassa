import { describe, expect, it } from 'vitest';
import { createCarState } from '../../src/core/car';
import {
  collideTraffic, createCollisionResult, createTraffic, parseTrafficKinds, type CollisionParams, type TrafficCar,
} from '../../src/core/traffic';
import data from '../../src/data/traffic.json';

const kinds = parseTrafficKinds(data);
const DT = 1 / 60;
const P: CollisionParams = { front: 1.6, rear: 2.7, width: 1.75, damagePerImpact: 2, damageSide: 3, stunTime: 3 };

function scene(c: Partial<TrafficCar>, player: { z: number; x: number; speed: number }) {
  const t = createTraffic(4, 1);
  Object.assign(t.cars[0]!, { active: true, kind: 0, paint: 0, dir: 1, lane: 0, x: 1.75, cruise: 20, length: 4.3, width: 1.75, stun: 0, ...c });
  const car = createCarState();
  Object.assign(car, player);
  return { t, car, out: createCollisionResult() };
}

describe('столкновения с трафиком', () => {
  it('нет пересечения — нет удара', () => {
    const { t, car, out } = scene({ z: 20, speed: 20 }, { z: 0, x: 1.75, speed: 25 });
    expect(collideTraffic(out, t, kinds, car, P, DT).kind).toBe('none');
    const side = scene({ z: 2, speed: 20, x: -1.75 }, { z: 0, x: 1.75, speed: 25 });
    expect(collideTraffic(side.out, side.t, kinds, side.car, P, DT).kind).toBe('none');
  });

  it('догнал попутную: удар спереди, повреждение по разнице скоростей, машины разведены', () => {
    const { t, car, out } = scene({ z: 3.5, speed: 15 }, { z: 0, x: 1.75, speed: 25 });
    collideTraffic(out, t, kinds, car, P, DT);
    expect(out.kind).toBe('front');
    expect(out.impact).toBeCloseTo(10);
    expect(out.damage).toBeCloseTo(20);
    expect(car.speed).toBeLessThan(25);
    expect(t.cars[0]!.speed).toBeGreaterThan(15);
    expect(t.cars[0]!.stun).toBe(3);
    expect(car.z + P.front).toBeLessThanOrEqual(t.cars[0]!.z - 4.3 / 2);
    // Повторной проверкой удара уже нет
    expect(collideTraffic(out, t, kinds, car, P, DT).kind).toBe('none');
  });

  it('грузовик тяжелее: игрок почти останавливается, грузовик почти не теряет скорость', () => {
    const { t, car, out } = scene({ z: 7, speed: 0, kind: 1, length: 12, width: 2.5 }, { z: 0, x: 1.75, speed: 20 });
    collideTraffic(out, t, kinds, car, P, DT);
    expect(car.speed).toBeLessThan(2);
    expect(t.cars[0]!.speed).toBeLessThan(5);
  });

  it('догнали сзади: удар сзади, игрока толкает вперёд', () => {
    const { t, car, out } = scene({ z: -4.5, speed: 20 }, { z: 0, x: 1.75, speed: 5 });
    collideTraffic(out, t, kinds, car, P, DT);
    expect(out.kind).toBe('rear');
    expect(out.impact).toBeCloseTo(15);
    expect(car.speed).toBeGreaterThan(5);
  });

  it('лобовое со встречной: обе встают, большое повреждение', () => {
    const { t, car, out } = scene({ z: 3.5, speed: 20, dir: -1, x: -1.75 }, { z: 0, x: -1.5, speed: 25 });
    collideTraffic(out, t, kinds, car, P, DT);
    expect(out.kind).toBe('headon');
    expect(out.impact).toBeCloseTo(45);
    expect(out.damage).toBeCloseTo(90);
    expect(car.speed).toBe(0);
    expect(t.cars[0]!.speed).toBe(0);
  });

  it('касание боком: выталкивает в сторону, небольшое повреждение', () => {
    const { t, car, out } = scene({ z: 1, speed: 20, x: 1.75 }, { z: 0, x: 0.3, speed: 22 });
    collideTraffic(out, t, kinds, car, P, DT);
    expect(out.kind).toBe('side');
    expect(out.damage).toBe(3);
    expect(car.x).toBeLessThan(0);
    expect(car.speed).toBeLessThan(22);
  });

  it('толкание и скрежет: повреждение не чаще раза в 0.5 с, мягкий удар — без повреждений', () => {
    const soft = scene({ z: 3.5, speed: 10 }, { z: 0, x: 1.75, speed: 11 });
    collideTraffic(soft.out, soft.t, kinds, soft.car, P, DT);
    expect(soft.out.kind).toBe('front');
    expect(soft.out.damage).toBe(0);
    const { t, car, out } = scene({ z: 1, speed: 20, x: 1.75 }, { z: 0, x: 0.3, speed: 22 });
    let total = 0;
    for (let i = 0; i < 30; i++) {
      car.x = 0.3; // игрок прижимается к машине боком
      total += collideTraffic(out, t, kinds, car, P, DT).damage;
    }
    expect(total).toBe(3);
  });

  it('повреждение зависит от того, во что врезались: мотоцикл < легковая < грузовик', () => {
    const hit = (kind: number, length: number, width: number) => {
      const { t, car, out } = scene({ z: length / 2 + 1.3, speed: 5, kind, length, width }, { z: 0, x: 1.75, speed: 15 });
      return collideTraffic(out, t, kinds, car, P, DT).damage;
    };
    const moto = hit(3, 2.1, 0.8);
    const car = hit(0, 4.3, 1.75);
    const truck = hit(1, 12, 2.5);
    expect(car).toBeCloseTo(20);
    expect(moto).toBeLessThan(car * 0.6);
    expect(truck).toBeGreaterThan(car * 1.5);
  });
});

