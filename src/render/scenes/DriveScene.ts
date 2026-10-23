// Сцена езды. M1.1: псевдо-3D трасса по seed; машина пока сама разгоняется по центру дороги
// (физика, руль и кабина — следующие задачи M1).
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { getContext, type GameContext } from '../../context';
import { advance, createFixedStep, type FixedStep } from '../../core/loop';
import { createRng, hashSeed } from '../../core/rng';
import { focalFromFov, generateRoad, segmentIndexAt, type ProjectionView, type Road } from '../../core/road';
import { getTuning, type Tuning } from '../../core/tuning';
import { DAY_PALETTE, NIGHT_PALETTE, RoadRenderer, type RoadPalette, type RoadView } from '../road/RoadRenderer';
import { createButton } from '../ui/Button';
import { t } from '../ui/strings';

/** Трасса по seed и параметрам генерации из tuning.json. */
export function buildRoad(seed: number, tn: Tuning): Road {
  return generateRoad(createRng(hashSeed(`road:${seed}`)), {
    segmentLength: getTuning(tn, 'road.segmentLength'),
    length: getTuning(tn, 'road.trackLength'),
    curveMax: getTuning(tn, 'road.curveMax'),
    hillMax: getTuning(tn, 'road.hillMax'),
    maxGrade: getTuning(tn, 'road.maxGrade'),
    lanes: 2,
  });
}

function paletteFor(ctx: GameContext): RoadPalette {
  const h = ctx.state.timeOfDay;
  return h < 6 || h >= 21 ? NIGHT_PALETTE : DAY_PALETTE;
}

export class DriveScene extends Phaser.Scene {
  private ctx!: GameContext;
  private loop!: FixedStep;
  private road!: Road;
  private roadRenderer!: RoadRenderer;
  private palette!: RoadPalette;
  private speedText!: Phaser.GameObjects.Text;
  private speed = 0;
  private position = 0;
  private shownKmh = -1;
  private readonly projection: ProjectionView = { focal: 1, centerX: GAME_WIDTH / 2, horizonY: GAME_HEIGHT / 2 };
  private readonly view: RoadView = {
    z: 0,
    x: 0,
    cameraHeight: 1.2,
    drawDistance: 300,
    laneWidth: 3.5,
    view: this.projection,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  };

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

    this.road = buildRoad(this.ctx.state.seed, this.ctx.tuning);
    this.palette = paletteFor(this.ctx);
    this.cameras.main.setBackgroundColor(this.palette.sky);
    const maxDraw = this.ctx.tuning.data.params['render.drawDistance']?.max ?? 600;
    this.roadRenderer = new RoadRenderer(this, maxDraw);

    this.speedText = this.add.text(1240, 690, '', { fontFamily: 'monospace', fontSize: '40px', color: '#ffffff' })
      .setOrigin(1, 1).setShadow(2, 2, '#000000', 4);
    createButton(this, 160, 650, t('back'), () => this.scene.start('menu'), { width: 240, height: 88 });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.roadRenderer.destroy());
  }

  private tick = (dt: number): void => {
    const tn = this.ctx.tuning;
    // Временный автопилот до M1.2: разгон до максимума с квадратичным сопротивлением
    const drag = getTuning(tn, 'car.drag') * this.speed * this.speed * 0.05;
    const accel = getTuning(tn, 'car.accel') - drag;
    this.speed = Math.min(getTuning(tn, 'car.maxSpeed'), Math.max(0, this.speed + accel * dt));
    this.position = (this.position + this.speed * dt) % this.road.length;
  };

  override update(_time: number, deltaMs: number): void {
    advance(this.loop, deltaMs / 1000, this.tick);

    const tn = this.ctx.tuning;
    this.projection.focal = focalFromFov(getTuning(tn, 'road.fieldOfView'), GAME_WIDTH);
    this.projection.horizonY = GAME_HEIGHT * getTuning(tn, 'render.horizon');
    const v = this.view;
    v.z = this.position;
    v.x = 0;
    v.cameraHeight = getTuning(tn, 'road.cameraHeight');
    v.drawDistance = getTuning(tn, 'render.drawDistance');
    v.laneWidth = getTuning(tn, 'road.laneWidth');
    this.roadRenderer.render(this.road, v, this.palette);

    const kmh = Math.round(this.speed * 3.6);
    if (kmh !== this.shownKmh) {
      this.shownKmh = kmh;
      this.speedText.setText(`${kmh} км/ч`);
    }
    const d = this.ctx.debug;
    d.speed = this.speed;
    d.segment = segmentIndexAt(this.road, this.position);
    d.x = v.x;
  }
}
