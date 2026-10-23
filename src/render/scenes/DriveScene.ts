// Сцена езды — заглушка M0: цветное небо по погоде/времени, условная дорога с разметкой,
// фиксированный шаг симуляции. Числа берутся из tuning.json, поэтому слайдеры debug-панели видны сразу.
import Phaser from 'phaser';
import { getContext, type GameContext } from '../../context';
import { advance, createFixedStep, type FixedStep } from '../../core/loop';
import { getTuning } from '../../core/tuning';
import { createButton } from '../ui/Button';
import { t } from '../ui/strings';

const HORIZON = 300;
const ROAD_HALF_WIDTH = 3.5; // м
const DASH_COUNT = 40;

function skyColor(ctx: GameContext): number {
  const { weather, timeOfDay } = ctx.state;
  const night = timeOfDay < 6 || timeOfDay >= 21;
  if (night) return 0x0b1530;
  if (weather === 'fog') return 0xb8bec4;
  if (weather === 'rain' || weather === 'heavy_rain' || weather === 'cloudy') return 0x6f8496;
  if (weather === 'snow') return 0xdde6ee;
  return 0x5fb4f0;
}

export class DriveScene extends Phaser.Scene {
  private ctx!: GameContext;
  private loop!: FixedStep;
  private road!: Phaser.GameObjects.Graphics;
  private speedText!: Phaser.GameObjects.Text;
  private speed = 0;
  private position = 0;
  private shownKmh = -1;

  constructor() {
    super('drive');
  }

  create(): void {
    this.ctx = getContext();
    this.ctx.debug.scene = 'drive';
    this.loop = createFixedStep();
    this.speed = 0;
    this.position = 0;
    this.shownKmh = -1;

    const night = this.ctx.state.timeOfDay < 6 || this.ctx.state.timeOfDay >= 21;
    this.cameras.main.setBackgroundColor(skyColor(this.ctx));
    this.add.rectangle(640, (HORIZON + 720) / 2, 1280, 720 - HORIZON, night ? 0x1d3a1d : 0x4c9a2a);
    this.road = this.add.graphics();

    // Образцы текстур из реестра (процедурные заглушки)
    this.add.image(170, 470, 'tree').setScale(1.6);
    this.add.image(1100, 450, 'sign_speed').setScale(1.2);
    this.add.image(1010, 480, 'hitchhiker').setScale(1.1);
    this.add.image(640, 600, 'car_rear').setScale(1.4);

    this.add.text(640, 200, t('driveStub'), { fontFamily: 'sans-serif', fontSize: '44px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5).setShadow(2, 2, '#000000', 4);
    this.speedText = this.add.text(1240, 690, '', { fontFamily: 'monospace', fontSize: '40px', color: '#ffffff' })
      .setOrigin(1, 1).setShadow(2, 2, '#000000', 4);
    createButton(this, 160, 650, t('back'), () => this.scene.start('menu'), { width: 240, height: 88 });
  }

  private tick = (dt: number): void => {
    const tn = this.ctx.tuning;
    // Простейший разгон до максимума с квадратичным сопротивлением — только для M0
    const drag = getTuning(tn, 'car.drag') * this.speed * this.speed * 0.05;
    const accel = getTuning(tn, 'car.accel') - drag;
    this.speed = Math.min(getTuning(tn, 'car.maxSpeed'), Math.max(0, this.speed + accel * dt));
    this.position += this.speed * dt;
  };

  override update(_time: number, deltaMs: number): void {
    advance(this.loop, deltaMs / 1000, this.tick);

    const tn = this.ctx.tuning;
    const segLen = getTuning(tn, 'road.segmentLength');
    const camH = getTuning(tn, 'road.cameraHeight');
    const fov = getTuning(tn, 'road.fieldOfView');
    const drawDist = getTuning(tn, 'render.drawDistance') * segLen;
    const focal = 640 / Math.tan((fov * Math.PI) / 360);
    const zNear = (camH * focal) / (720 - HORIZON);

    const g = this.road;
    g.clear();
    // Полотно: трапеция от ближней точки до дальности прорисовки
    const yNear = 720;
    const yFar = HORIZON + (camH * focal) / drawDist;
    const wNear = (ROAD_HALF_WIDTH * focal) / zNear;
    const wFar = (ROAD_HALF_WIDTH * focal) / drawDist;
    g.fillStyle(0x555b61);
    g.fillTriangle(640 - wNear, yNear, 640 + wNear, yNear, 640 + wFar, yFar);
    g.fillTriangle(640 - wNear, yNear, 640 + wFar, yFar, 640 - wFar, yFar);

    // Разметка: штрих на каждом сегменте, движется со скоростью машины
    g.fillStyle(0xf5f5f5);
    const offset = this.position % segLen;
    for (let i = 0; i < DASH_COUNT; i++) {
      const z1 = Math.max(zNear, (i + 1) * segLen - offset);
      const z2 = z1 + segLen * 0.5;
      if (z1 > drawDist) break;
      const y1 = HORIZON + (camH * focal) / z1;
      const y2 = HORIZON + (camH * focal) / z2;
      const w1 = (0.08 * focal) / z1;
      const w2 = (0.08 * focal) / z2;
      g.fillTriangle(640 - w1, y1, 640 + w1, y1, 640 + w2, y2);
      g.fillTriangle(640 - w1, y1, 640 + w2, y2, 640 - w2, y2);
    }

    const kmh = Math.round(this.speed * 3.6);
    if (kmh !== this.shownKmh) {
      this.shownKmh = kmh;
      this.speedText.setText(`${kmh} км/ч`);
    }
    const d = this.ctx.debug;
    d.speed = this.speed;
    d.segment = Math.floor(this.position / segLen);
    d.x = 0;
  }
}
