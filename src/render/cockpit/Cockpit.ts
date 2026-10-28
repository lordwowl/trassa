// Простая кабина: левый руль, правостороннее движение.
// Водитель слева: руль и приборы сдвинуты влево, справа — центральная консоль и торпедо пассажира.
// Стойки несимметричны: левая ближе к глазам — шире, правая дальше — тоньше.
// Всё процедурное и статичное; в кадре меняются только стрелка и угол руля.
import Phaser from 'phaser';
import { Speedometer } from './Speedometer';
import { SteeringWheel } from './SteeringWheel';

/** Низ лобового стекла (верх приборной панели), px. */
export const DASH_TOP = 418;
/** Ось руля и приборов водителя по X, px. */
export const DRIVER_X = 470;
/** Центральная консоль: левый край и ширина, px. */
const CONSOLE_X = 720;
const CONSOLE_W = 170;

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
    g.fillTriangle(0, 0, 120, 0, 0, DASH_TOP + 70);
    g.fillTriangle(W, 0, W - 45, 0, W, DASH_TOP + 10);
    // Уплотнитель стекла
    g.lineStyle(4, 0x2e3137);
    g.lineBetween(120, 0, 0, DASH_TOP + 70);
    g.lineBetween(W - 45, 0, W, DASH_TOP + 10);
    g.lineBetween(120, 14, W - 45, 14);

    // Приборная панель: над приборами водителя выше («козырёк»), к пассажиру ниже
    const pts: Phaser.Types.Math.Vector2Like[] = [{ x: 0, y: H }, { x: 0, y: DASH_TOP + 60 }];
    for (let i = 0; i <= 24; i++) {
      const x = (W * i) / 24;
      const hump = Math.exp(-(((x - DRIVER_X) / 230) ** 2)) * 46;
      pts.push({ x, y: DASH_TOP + 52 - hump - (x / W) * 12 });
    }
    pts.push({ x: W, y: H });
    const edge = pts.slice(1, pts.length - 1);
    // Тёмная панель и светлый кант по краю — чтобы не сливалась с асфальтом
    g.fillStyle(0x17191d).fillPoints(pts, true);
    g.lineStyle(10, 0x0b0c0e).strokePoints(edge, false);
    g.lineStyle(3, 0x5a606b).strokePoints(edge, false);
    // Козырёк над приборами
    g.fillStyle(0x101114).fillEllipse(DRIVER_X, DASH_TOP + 4, 300, 44);

    // Центральная консоль: место под магнитолу/навигатор (M2) и решётки обдува
    const cy = DASH_TOP + 70;
    g.fillStyle(0x121317).fillRoundedRect(CONSOLE_X, cy, CONSOLE_W, H - cy + 20, 14);
    g.lineStyle(2, 0x2f333a).strokeRoundedRect(CONSOLE_X, cy, CONSOLE_W, H - cy + 20, 14);
    g.fillStyle(0x0a0b0d).fillRoundedRect(CONSOLE_X + 18, cy + 18, CONSOLE_W - 36, 30, 6);
    g.lineStyle(2, 0x2a2d33);
    for (let i = 0; i < 4; i++) g.lineBetween(CONSOLE_X + 22, cy + 24 + i * 7, CONSOLE_X + CONSOLE_W - 22, cy + 24 + i * 7);
    g.fillStyle(0x1d2025).fillRoundedRect(CONSOLE_X + 18, cy + 64, CONSOLE_W - 36, 80, 8);
    g.lineStyle(2, 0x343841).strokeRoundedRect(CONSOLE_X + 18, cy + 64, CONSOLE_W - 36, 80, 8);

    // Торпедо пассажира: бардачок
    g.lineStyle(2, 0x2a2d33).strokeRoundedRect(CONSOLE_X + CONSOLE_W + 50, DASH_TOP + 110, 260, 80, 10);

    this.speedometer = new Speedometer(scene, DRIVER_X, DASH_TOP + 82, 74, speedoMaxKmh, DEPTH + 1);
    this.wheel = new SteeringWheel(scene, DRIVER_X, H + 70, 210, DEPTH + 3);
  }

  update(kmh: number, wheelDeg: number): void {
    this.speedometer.set(kmh);
    this.wheel.setAngle(wheelDeg);
  }
}
