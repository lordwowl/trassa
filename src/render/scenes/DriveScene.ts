// Сцена езды. Псевдо-3D трасса по seed, физика машины (core/car), управление: педали, руль наклоном или кнопками, клавиатура.
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { getContext, type GameContext } from '../../context';
import { createCarParams, createCarState, readCarParams, readRoadContext, stepCar, type CarInput, type CarParams, type CarState, type RoadContext } from '../../core/car';
import { advance, createFixedStep, type FixedStep } from '../../core/loop';
import { createRng, hashSeed } from '../../core/rng';
import { focalFromFov, generateRoad, segmentIndexAt, type ProjectionView, type Road } from '../../core/road';
import { getTuning, type Tuning } from '../../core/tuning';
import { DriveControls } from '../../input/DriveControls';
import { Cockpit } from '../cockpit/Cockpit';
import { DAY_PALETTE, NIGHT_PALETTE, RoadRenderer, type RoadPalette, type RoadView } from '../road/RoadRenderer';
import { createButton } from '../ui/Button';
import { t } from '../ui/strings';

/** Кнопки поверх кабины и педалей. */
const HUD_DEPTH = 60;

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
  private cockpit!: Cockpit;
  private controls!: DriveControls;
  private modeButton!: Phaser.GameObjects.Container;
  private calibrateButton!: Phaser.GameObjects.Container;
  private shownTilt: boolean | null = null;
  private shownMode: string | null = null;
  private car: CarState = createCarState();
  private carParams!: CarParams;
  private readonly carInput: CarInput = { throttle: 0, brake: 0, steer: 0 };
  private readonly roadCtx: RoadContext = { curve: 0, grade: 0, halfWidth: 0 };
  private laneWidth = 3.5;
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
    this.car = createCarState();
    // Правостороннее движение: старт по центру правой полосы
    this.car.x = getTuning(this.ctx.tuning, 'road.laneWidth') / 2;
    this.carParams = createCarParams(this.ctx.tuning);

    this.road = buildRoad(this.ctx.state.seed, this.ctx.tuning);
    this.palette = paletteFor(this.ctx);
    this.cameras.main.setBackgroundColor(this.palette.sky);
    const maxDraw = this.ctx.tuning.data.params['render.drawDistance']?.max ?? 600;
    this.roadRenderer = new RoadRenderer(this, maxDraw);
    this.controls = new DriveControls(this, { gas: t('gas'), brake: t('brake') });

    this.cockpit = new Cockpit(this, getTuning(this.ctx.tuning, 'cockpit.speedoMax'));
    // Верхний ряд: низ экрана занят педалями и рулём
    createButton(this, 106, 52, t('menu'), () => this.scene.start('menu'), { width: 180, height: 72, fontSize: 30, color: 0x44515e }).setDepth(HUD_DEPTH);
    this.modeButton = createButton(this, 357, 52, '', () => this.controls.toggleMode(), { width: 290, height: 72, fontSize: 26, color: 0x44515e }).setDepth(HUD_DEPTH);
    this.calibrateButton = createButton(this, 628, 52, t('calibrate'), () => this.controls.calibrate(), { width: 220, height: 72, fontSize: 26, color: 0x44515e }).setDepth(HUD_DEPTH);
    this.shownTilt = null;
    this.shownMode = null;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.roadRenderer.destroy());
  }

  private tick = (dt: number): void => {
    readRoadContext(this.roadCtx, this.road, this.car.z, this.laneWidth);
    stepCar(this.car, this.carInput, this.carParams, this.roadCtx, dt);
  };

  override update(time: number, deltaMs: number): void {
    const tn = this.ctx.tuning;
    readCarParams(this.carParams, tn);
    this.laneWidth = getTuning(tn, 'road.laneWidth');
    this.controls.read(this.carInput, tn, deltaMs / 1000);
    this.updateHud();
    advance(this.loop, deltaMs / 1000, this.tick);
    const car = this.car;

    this.projection.focal = focalFromFov(getTuning(tn, 'road.fieldOfView'), GAME_WIDTH);
    this.projection.horizonY = GAME_HEIGHT * getTuning(tn, 'render.horizon');
    const v = this.view;
    v.z = car.z;
    // Камера — на месте водителя (левее центра машины)
    v.x = car.x + getTuning(tn, 'cockpit.seatOffset');
    v.cameraHeight = getTuning(tn, 'road.cameraHeight');
    v.drawDistance = getTuning(tn, 'render.drawDistance');
    v.laneWidth = this.laneWidth;
    this.roadRenderer.render(this.road, v, this.palette);
    // Тряска на обочине: детерминированные синусы, амплитуда растёт со скоростью
    let shake = 0;
    if (car.offroad && car.speed > 0.5) {
      const amp = getTuning(tn, 'render.shake') * Math.min(1, car.speed / this.carParams.offroadMaxSpeed);
      shake = amp * (Math.sin(time * 0.071) * 0.6 + Math.sin(time * 0.153) * 0.4);
    }
    this.roadRenderer.graphics.y = shake;

    this.cockpit.update(car.speed * 3.6, car.steer * getTuning(tn, 'cockpit.wheelMaxAngle'));
    const d = this.ctx.debug;
    d.speed = car.speed;
    d.segment = segmentIndexAt(this.road, car.z);
    d.x = car.x;
  }

  /** Подписи кнопок режима руля — только при изменении. */
  private updateHud(): void {
    const tilt = this.controls.tiltActive;
    const mode = this.controls.mode;
    if (tilt === this.shownTilt && mode === this.shownMode) return;
    this.shownTilt = tilt;
    this.shownMode = mode;
    const label = this.modeButton.getAt(1) as Phaser.GameObjects.Text;
    label.setText(mode === 'buttons' ? t('steerButtons') : tilt ? t('steerTilt') : t('steerTiltNoSensor'));
    this.calibrateButton.setVisible(tilt);
  }
}
