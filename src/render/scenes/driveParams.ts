// Параметры трафика и столкновений из tuning.json (без аллокаций, каждый кадр).
import { getTuning, type Tuning } from '../../core/tuning';
import type { CollisionParams, TrafficParams } from '../../core/traffic';

export function readTrafficParams(p: TrafficParams, c: CollisionParams, tn: Tuning): void {
  p.density = getTuning(tn, 'traffic.density');
  p.oncomingDensity = getTuning(tn, 'traffic.oncomingDensity');
  p.speedScale = getTuning(tn, 'traffic.speedScale');
  p.headway = getTuning(tn, 'traffic.headway');
  p.minGap = getTuning(tn, 'traffic.minGap');
  p.accel = getTuning(tn, 'traffic.accel');
  p.brake = getTuning(tn, 'traffic.brake');
  p.spawnAhead = getTuning(tn, 'traffic.spawnAhead');
  p.despawnBehind = getTuning(tn, 'traffic.despawnBehind');
  p.laneWidth = getTuning(tn, 'road.laneWidth');
  p.overtakeChance = getTuning(tn, 'traffic.overtakeChance');
  p.overtakeBoost = getTuning(tn, 'traffic.overtakeBoost');
  p.signalLead = getTuning(tn, 'traffic.signalLead');
  p.laneChangeSpeed = getTuning(tn, 'traffic.laneChangeSpeed');
  p.glareChance = getTuning(tn, 'traffic.glareChance');
  c.front = getTuning(tn, 'car.frontOverhang');
  c.rear = getTuning(tn, 'car.rearOverhang');
  c.width = getTuning(tn, 'car.width');
  c.damagePerImpact = getTuning(tn, 'car.damagePerImpact');
  c.damageSide = getTuning(tn, 'car.damageSide');
  c.stunTime = getTuning(tn, 'traffic.stunTime');
}
