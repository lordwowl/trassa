// Простая кабина: левый руль, правостороннее движение.
// Водитель слева: руль и приборы сдвинуты влево, справа — центральная консоль и торпедо пассажира.
// Стойки несимметричны: левая ближе к глазам — шире, правая дальше — тоньше.
// Всё процедурное и статичное; в кадре меняются только стрелка и угол руля.
import Phaser from 'phaser';
import { Gauge } from './Gauge';
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
  readonly speedometer: Gauge;
  readonly tachometer: Gauge;
  /** Кэш подписей «A1»…«M5» и чисел скорости — без создания строк в кадре. */
  private readonly gearLabels: string[] = [];
  private readonly kmhLabels: string[] = [];
  readonly wheel: SteeringWheel;
  private readonly clock: Phaser.GameObjects.Text;
  private shownClock = '';

  constructor(scene: Phaser.Scene, speedoMaxKmh: number, redline: number) {
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

    // Центральная консоль: часы, место под магнитолу/навигатор (M2.5)
    const cy = DASH_TOP + 70;
    g.fillStyle(0x121317).fillRoundedRect(CONSOLE_X, cy, CONSOLE_W, H - cy + 20, 14);
    g.lineStyle(2, 0x2f333a).strokeRoundedRect(CONSOLE_X, cy, CONSOLE_W, H - cy + 20, 14);
    g.fillStyle(0x060a08).fillRoundedRect(CONSOLE_X + 18, cy + 10, CONSOLE_W - 36, 36, 6);
    g.lineStyle(2, 0x2a2d33).strokeRoundedRect(CONSOLE_X + 18, cy + 10, CONSOLE_W - 36, 36, 6);
    this.clock = scene.add
      .text(CONSOLE_X + CONSOLE_W / 2, cy + 28, '', { fontFamily: 'monospace', fontSize: '26px', color: '#5dff9a' })
      .setOrigin(0.5)
      .setDepth(DEPTH + 1);

    // Торпедо пассажира: бардачок
    g.lineStyle(2, 0x2a2d33).strokeRoundedRect(CONSOLE_X + CONSOLE_W + 50, DASH_TOP + 110, 260, 80, 10);

    this.speedometer = new Gauge(scene, DRIVER_X, DASH_TOP + 82, 74, {
      max: speedoMaxKmh, majorStep: 20, labelEvery: 2, labelDivisor: 1, redFrom: 120, unit: 'км/ч',
    }, DEPTH + 1);
    const rpmMax = Math.ceil((redline + 1000) / 1000) * 1000;
    this.tachometer = new Gauge(scene, DRIVER_X + 170, DASH_TOP + 90, 60, {
      max: rpmMax, majorStep: 1000, labelEvery: 1, labelDivisor: 1000, redFrom: redline, unit: 'об/мин ×1000',
    }, DEPTH + 1);
    for (let g = 0; g <= 5; g++) this.gearLabels.push(`A${g}`, `M${g}`);
    for (let v = 0; v <= 400; v++) this.kmhLabels.push(String(v));
    this.wheel = new SteeringWheel(scene, DRIVER_X, H + 70, 210, DEPTH + 3);
  }

  /** Часы на консоли; строку передавать только при смене минуты. */
  setClock(text: string): void {
    if (text !== this.shownClock) {
      this.shownClock = text;
      this.clock.setText(text);
    }
  }

  update(kmh: number, wheelDeg: number, rpm: number, gear: number, manual: boolean): void {
    this.speedometer.setValue(kmh);
    this.speedometer.setText(this.kmhLabels[Math.min(400, Math.max(0, Math.round(kmh)))] as string);
    this.tachometer.setValue(rpm);
    this.tachometer.setText(this.gearLabels[Math.min(5, gear) * 2 + (manual ? 1 : 0)] as string);
    this.wheel.setAngle(wheelDeg);
  }
}
