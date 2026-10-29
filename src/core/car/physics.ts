// Шаг физики машины. Без аллокаций: меняет переданное состояние.

import { segmentByIndex, wrapZ, type Road } from '../road';
import { getTuning, type Tuning } from '../tuning';
import { engineAccel, gearTopSpeed, updateGear } from './gearbox';
import type { CarInput, CarParams, CarState, RoadContext } from './types';

const G = 9.81;
const GEAR_KEYS = ['car.gear1', 'car.gear2', 'car.gear3', 'car.gear4', 'car.gear5'];

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Плавно приближает value к target не быстрее rate·dt. */
function approach(value: number, target: number, step: number): number {
  if (value < target) return Math.min(target, value + step);
  return Math.max(target, value - step);
}

/** Повреждения, с которых машину уводит в сторону и с которых падает макс. скорость, %. */
export const DAMAGE_PULL_FROM = 30;
export const DAMAGE_SLOW_FROM = 60;

export function stepCar(car: CarState, input: CarInput, p: CarParams, road: RoadContext, dt: number): void {
  // При 100% повреждений двигатель не тянет — машина встаёт
  const dead = car.damage >= 100;
  const throttle = dead ? 0 : clamp(input.throttle, 0, 1);
  const brake = clamp(input.brake, 0, 1);
  const v = car.speed;

  // Продольное ускорение: двигатель через КПП, тормоз, сопротивления, уклон
  updateGear(car, input, p, dt);
  let a = engineAccel(car, throttle, p, dt);
  const grip = road.grip > 0.05 ? road.grip : 0.05;
  a -= brake * p.braking * grip;
  a -= p.drag * v * v;
  a -= p.gravity * G * road.grade;
  if (v > 0) a -= p.rolling;
  if (car.offroad && v > p.offroadMaxSpeed) a -= p.offroadDecel;

  let speed = v + a * dt;
  // Сопротивления и тормоз не разгоняют машину назад
  if (speed < 0) speed = 0;
  let vmax = gearTopSpeed(p, p.gearCount);
  if (car.damage > DAMAGE_SLOW_FROM) vmax *= 1 - (p.damageSpeedLoss * (car.damage - DAMAGE_SLOW_FROM)) / (100 - DAMAGE_SLOW_FROM);
  // Выше предела (после повреждения) — плавно сбрасываем, а не обрезаем скачком
  if (speed > vmax) speed = Math.max(vmax, v - p.braking * 0.3 * dt);
  car.speed = speed;
  car.z += speed * dt;

  // Руль и боковое движение
  car.steer = approach(car.steer, clamp(input.steer, -1, 1), p.steerResponse * dt);
  // Повреждённую машину уводит вправо, как при сбитом сходе-развале
  const pull = car.damage > DAMAGE_PULL_FROM ? (p.damagePull * (car.damage - DAMAGE_PULL_FROM)) / (100 - DAMAGE_PULL_FROM) : 0;
  const lateral = (car.steer + pull) * p.steerGain * speed * (0.5 + 0.5 * grip) - (p.centrifugal * speed * speed * road.curve) / grip;
  const limit = road.halfWidth + p.offroadLimit;
  car.x = clamp(car.x + lateral * dt, -limit, limit);
  car.offroad = Math.abs(car.x) > road.halfWidth;
}

/** Заполняет параметры из tuning.json (без аллокаций). */
export function readCarParams(out: CarParams, t: Tuning): CarParams {
  out.maxSpeed = getTuning(t, 'car.maxSpeed');
  out.accel = getTuning(t, 'car.accel');
  out.gearCount = Math.round(getTuning(t, 'car.gearCount'));
  if (!out.gearTops) out.gearTops = [0, 0, 0, 0, 0];
  for (let i = 0; i < 5; i++) out.gearTops[i] = getTuning(t, GEAR_KEYS[i] as string);
  out.gearBoost = getTuning(t, 'car.gearBoost');
  out.idleRpm = getTuning(t, 'car.idleRpm');
  out.redline = getTuning(t, 'car.redline');
  out.upshiftAt = getTuning(t, 'car.upshiftAt');
  out.downshiftAt = getTuning(t, 'car.downshiftAt');
  out.shiftTime = getTuning(t, 'car.shiftTime');
  out.braking = getTuning(t, 'car.braking');
  out.drag = getTuning(t, 'car.drag');
  out.rolling = getTuning(t, 'car.rolling');
  out.engineBrake = getTuning(t, 'car.engineBrake');
  out.gravity = getTuning(t, 'car.gravity');
  out.steerGain = getTuning(t, 'car.steerGain');
  out.steerResponse = getTuning(t, 'car.steerResponse');
  out.centrifugal = getTuning(t, 'car.centrifugal');
  out.offroadDecel = getTuning(t, 'car.offroadDecel');
  out.offroadMaxSpeed = getTuning(t, 'car.offroadMaxSpeed');
  out.offroadLimit = getTuning(t, 'car.offroadLimit');
  out.damagePull = getTuning(t, 'car.damagePull');
  out.damageSpeedLoss = getTuning(t, 'car.damageSpeedLoss');
  return out;
}

export function createCarParams(t: Tuning): CarParams {
  return readCarParams({} as CarParams, t);
}

/** Заполняет контекст дороги в точке z (без аллокаций). */
export function readRoadContext(out: RoadContext, road: Road, z: number, laneWidth: number): RoadContext {
  const L = road.segmentLength;
  const i = Math.floor(wrapZ(road, z) / L);
  const seg = segmentByIndex(road, i);
  out.curve = seg.curve;
  out.grade = (segmentByIndex(road, i + 1).y - seg.y) / L;
  out.halfWidth = (seg.lanes * laneWidth) / 2;
  return out;
}
