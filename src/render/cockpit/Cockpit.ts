// Простая кабина (M1.4): крыша, стойки, приборная панель, спидометр и руль.
// Всё процедурное и статичное; в кадре меняются только стрелка и угол руля.
import Phaser from 'phaser';
import { Speedometer } from './Speedometer';
import { SteeringWheel } from './SteeringWheel';

/** Низ лобового стекла (верх приборной панели) в центре, px. */
export const DASH_TOP = 418;

const DEPTH = 40;
const W = 1280;
const H = 720;

export class Cockpit {
  readonly speedometer: Speedometer;
  readonly wheel: SteeringWheel;

  constructor(scene: Phaser.Scene, speedoMaxKmh: number) {
    const g = scene.add.graphics().setDepth(DEPTH);
    // Крыша и стойки
    g.fillStyle(0x1c1e22);
    g.fillRect(0, 0, W, 14);
    g.fillTriangle(0, 0, 70, 0, 0, DASH_TOP + 40);
    g.fillTriangle(W, 0, W - 70, 0, W, DASH_TOP + 40);
    // Уплотнитель стекла
    g.lineStyle(4, 0x2e3137);
    g.lineBetween(70, 0, 0, DASH_TOP + 40);
    g.lineBetween(W - 70, 0, W, DASH_TOP + 40);
    g.lineBetween(70, 14, W - 70, 14);

    // Приборная панель: верхний край слегка выгнут вверх к центру
    const pts: Phaser.Types.Math.Vector2Like[] = [{ x: 0, y: H }, { x: 0, y: DASH_TOP + 40 }];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      pts.push({ x: W * t, y: DASH_TOP + 40 - Math.sin(t * Math.PI) * 40 });
    }
    pts.push({ x: W, y: H });
    // Тёмная панель и светлый кант по краю — чтобы не сливалась с асфальтом
    g.fillStyle(0x17191d).fillPoints(pts, true);
    g.lineStyle(10, 0x0b0c0e);
    g.strokePoints(pts.slice(1, pts.length - 1), false);
    g.lineStyle(3, 0x5a606b);
    g.strokePoints(pts.slice(1, pts.length - 1), false);
    // Козырёк над приборами
    g.fillStyle(0x101114).fillEllipse(640, DASH_TOP + 4, 300, 44);

    this.speedometer = new Speedometer(scene, 640, DASH_TOP + 82, 74, speedoMaxKmh, DEPTH + 1);
    this.wheel = new SteeringWheel(scene, 640, H + 70, 220, DEPTH + 3);
  }

  update(kmh: number, wheelDeg: number): void {
    this.speedometer.set(kmh);
    this.wheel.setAngle(wheelDeg);
  }
}
