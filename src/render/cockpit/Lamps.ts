// Контрольные лампы и стрелка топлива на щитке (GDD 6): поворотники, ближний и дальний свет,
// резерв топлива, повреждения. Значки рисуются один раз, в кадре меняется только прозрачность.
import Phaser from 'phaser';

const OFF_ALPHA = 0.13;
/** Стрелка топлива: от «0» (слева) до «1» (справа) по верхней дуге, радианы. */
const FUEL_FROM = (200 * Math.PI) / 180;
const FUEL_TO = (340 * Math.PI) / 180;

export interface LampState {
  left: boolean;
  right: boolean;
  low: boolean;
  high: boolean;
  fuel: boolean;
  damage: boolean;
}

type Icon = (g: Phaser.GameObjects.Graphics) => void;

export class Lamps {
  private readonly left: Phaser.GameObjects.Graphics;
  private readonly right: Phaser.GameObjects.Graphics;
  private readonly low: Phaser.GameObjects.Graphics;
  private readonly high: Phaser.GameObjects.Graphics;
  private readonly fuel: Phaser.GameObjects.Graphics;
  private readonly damage: Phaser.GameObjects.Graphics;
  private readonly needle: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, depth: number, arrows: { y: number; left: number; right: number }, row: { y: number; x: number; step: number }, fuelGauge: { x: number; y: number; r: number; redBelow: number }) {
    const lamp = (x: number, y: number, icon: Icon): Phaser.GameObjects.Graphics => {
      const g = scene.add.graphics({ x, y }).setDepth(depth);
      icon(g);
      return g.setAlpha(OFF_ALPHA);
    };
    this.left = lamp(arrows.left, arrows.y, (g) => arrow(g, -1));
    this.right = lamp(arrows.right, arrows.y, (g) => arrow(g, 1));
    this.low = lamp(row.x, row.y, (g) => beam(g, 0x42d36b, true));
    this.high = lamp(row.x + row.step, row.y, (g) => beam(g, 0x3f86ff, false));
    this.fuel = lamp(row.x + row.step * 2, row.y, (g) => pump(g, 0xffb020, 1));
    this.damage = lamp(row.x + row.step * 3, row.y, wrench);

    // Указатель топлива: полукруглая шкала, красная зона резерва
    const { x, y, r, redBelow } = fuelGauge;
    const face = scene.add.graphics().setDepth(depth);
    face.fillStyle(0x15171b).fillCircle(x, y, r + 5);
    face.lineStyle(3, 0x8a9099).strokeCircle(x, y, r + 5);
    face.fillStyle(0x0d0f12).fillCircle(x, y, r);
    for (let i = 0; i <= 4; i++) {
      const f = i / 4;
      const a = FUEL_FROM + (FUEL_TO - FUEL_FROM) * f;
      face.lineStyle(i % 2 === 0 ? 3 : 2, f < redBelow ? 0xe0533d : 0xe8e8e8);
      face.lineBetween(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92);
    }
    if (redBelow > 0) {
      face.lineStyle(3, 0xe0533d).beginPath();
      face.arc(x, y, r * 0.92, FUEL_FROM, FUEL_FROM + (FUEL_TO - FUEL_FROM) * redBelow).strokePath();
    }
    const font = { fontFamily: 'sans-serif', fontSize: `${Math.round(r * 0.3)}px`, color: '#e8e8e8' };
    scene.add.text(x + Math.cos(FUEL_FROM) * r * 0.55, y - r * 0.05, '0', font).setOrigin(0.5).setDepth(depth);
    scene.add.text(x + Math.cos(FUEL_TO) * r * 0.55, y - r * 0.05, '1', font).setOrigin(0.5).setDepth(depth);
    const icon = scene.add.graphics({ x, y: y + r * 0.45 }).setDepth(depth);
    pump(icon, 0x9aa3ad, 0.6);
    this.needle = scene.add.graphics({ x, y }).setDepth(depth + 1);
    this.needle.fillStyle(0xff5a36).fillTriangle(-r * 0.1, -3, r * 0.8, 0, -r * 0.1, 3);
    this.needle.fillStyle(0xcfd4da).fillCircle(0, 0, r * 0.12);
  }

  /** Уровень топлива 0..1. */
  setFuel(level: number): void {
    const f = level < 0 ? 0 : level > 1 ? 1 : level;
    this.needle.rotation = FUEL_FROM + (FUEL_TO - FUEL_FROM) * f;
  }

  update(s: LampState): void {
    set(this.left, s.left);
    set(this.right, s.right);
    set(this.low, s.low);
    set(this.high, s.high);
    set(this.fuel, s.fuel);
    set(this.damage, s.damage);
  }
}

function set(g: Phaser.GameObjects.Graphics, on: boolean): void {
  const a = on ? 1 : OFF_ALPHA;
  if (g.alpha !== a) g.setAlpha(a);
}

/** Зелёная стрелка поворотника. */
function arrow(g: Phaser.GameObjects.Graphics, dir: number): void {
  g.fillStyle(0x3ee06a);
  g.fillTriangle(dir * 14, 0, 0, -11, 0, 11);
  g.fillRect(dir > 0 ? -12 : 0, -5, 12, 10);
}

/** Фара с лучами: ближний — лучи вниз (зелёный), дальний — прямые (синий). */
function beam(g: Phaser.GameObjects.Graphics, color: number, dipped: boolean): void {
  g.fillStyle(color).fillEllipse(5, 0, 14, 20);
  g.fillStyle(0x0d0f12).fillRect(5, -11, 8, 22);
  g.lineStyle(3, color);
  for (let i = -1; i <= 1; i++) g.lineBetween(-2, i * 6, -13, i * 6 + (dipped ? 5 : 0));
}

/** Бензоколонка: корпус, окошко и шланг. */
function pump(g: Phaser.GameObjects.Graphics, color: number, k: number): void {
  g.fillStyle(color).fillRect(-9 * k, -10 * k, 12 * k, 20 * k);
  g.fillStyle(0x0d0f12).fillRect(-6 * k, -7 * k, 6 * k, 5 * k);
  g.lineStyle(Math.max(2, 3 * k), color);
  g.lineBetween(3 * k, -6 * k, 9 * k, -2 * k);
  g.lineBetween(9 * k, -2 * k, 9 * k, 7 * k);
}

/** Гаечный ключ (повреждения). */
function wrench(g: Phaser.GameObjects.Graphics): void {
  g.lineStyle(5, 0xff4a3a).lineBetween(-8, 8, 5, -5);
  g.fillStyle(0xff4a3a).fillCircle(7, -7, 7);
  g.fillStyle(0x0d0f12).fillRect(6, -15, 6, 9);
}
