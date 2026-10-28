// Сцена езды. Псевдо-3D трасса по seed, физика машины (core/car), управление: педали, руль наклоном или кнопками, клавиатура.
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { getContext, type GameContext } from '../../context';
import {
  createCarParams, createCarState, createSignals, readCarParams, readRoadContext, signalLit, stepCar, stepSignals, toggleSignal,
  type CarInput, type CarParams, type CarState, type RoadContext, type SignalParams,
} from '../../core/car';
import { advance, createFixedStep, type FixedStep } from '../../core/loop';
import { createRng, hashSeed } from '../../core/rng';
import { createCurveAhead, decorateRoad, findCurveAhead, focalFromFov, generateRoad, segmentIndexAt, type ProjectionView, type Road } from '../../core/road';
import { getTuning, type Tuning } from '../../core/tuning';
import { Sfx } from '../../audio/Sfx';
import { DriveControls } from '../../input/DriveControls';
import { Cockpit } from '../cockpit/Cockpit';
import type { LampState } from '../cockpit/Lamps';
import { Mirrors } from '../cockpit/Mirrors';
import { advanceClock, formatClock } from '../../core/world';
import { createLighting, updateLighting, type LightingParams } from '../road/lighting';
import { ROAD_PALETTE, RoadRenderer, type RoadView } from '../road/RoadRenderer';
import { Sky } from '../road/Sky';
import { RoadsideSprites, type KindHeights } from '../road/RoadsideSprites';
import { DriveHud } from '../ui/DriveHud';
import { DriveWeather } from './DriveWeather';
import { t } from '../ui/strings';

/** Размер пула придорожных спрайтов. */
const SPRITE_POOL = 320;

/** Трасса и придорожные объекты по seed и параметрам из tuning.json (отдельные потоки RNG). */
export function buildRoad(seed: number, tn: Tuning): Road {
  const road = generateRoad(createRng(hashSeed(`road:${seed}`)), {
    segmentLength: getTuning(tn, 'road.segmentLength'),
    length: getTuning(tn, 'road.trackLength'),
    curveMax: getTuning(tn, 'road.curveMax'),
    hillMax: getTuning(tn, 'road.hillMax'),
    maxGrade: getTuning(tn, 'road.maxGrade'),
    lanes: 2,
  });
  decorateRoad(road, createRng(hashSeed(`roadside:${seed}`)), {
    laneWidth: getTuning(tn, 'road.laneWidth'),
    treeDensity: getTuning(tn, 'roadside.treeDensity'),
    treeMinOffset: getTuning(tn, 'roadside.treeMinOffset'),
    treeMaxOffset: getTuning(tn, 'roadside.treeMaxOffset'),
    poleSpacing: getTuning(tn, 'roadside.poleSpacing'),
    poleOffset: getTuning(tn, 'roadside.poleOffset'),
    signSpacing: getTuning(tn, 'roadside.signSpacing'),
  });
  return road;
}

export class DriveScene extends Phaser.Scene {
  private ctx!: GameContext;
  private loop!: FixedStep;
  private road!: Road;
  private roadRenderer!: RoadRenderer;
  private roadside!: RoadsideSprites;
  private readonly heights: KindHeights = { tree: 9, tree_round: 7, pole: 8, sign: 2.6 };
  private sky!: Sky;
  private weather!: DriveWeather;
  private readonly lighting = createLighting();
  private readonly lightParams: LightingParams = { nightAmbient: 0.1, lowRange: 45, highRange: 110, beamIntensity: 0.85, beamWidth: 4, beamFade: 3 };
  /** Минута, показанная на часах (строка часов создаётся только при её смене). */
  private shownMinute = -1;
  private timeSpeed = 30;
  private cockpit!: Cockpit;
  private mirrors!: Mirrors;
  private controls!: DriveControls;
  private hud!: DriveHud;
  private car: CarState = createCarState();
  private carParams!: CarParams;
  private readonly carInput: CarInput = { throttle: 0, brake: 0, steer: 0, manual: false, shift: 0 };
  private readonly roadCtx: RoadContext = { curve: 0, grade: 0, halfWidth: 0, grip: 1 };
  private readonly signals = createSignals();
  private readonly signalParams: SignalParams = { blinkPeriod: 0.8, armSteer: 0.6, laneChange: 2.8 };
  private shownBlink = false;
  private readonly lampState: LampState = { left: false, right: false, low: false, high: false, fuel: false, damage: false };
  private readonly curveAhead = createCurveAhead();
  private sfx!: Sfx;
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
    this.sky = new Sky(this);
    this.weather = new DriveWeather(this, this.ctx.state.seed);
    this.shownMinute = -1;
    const maxDraw = this.ctx.tuning.data.params['render.drawDistance']?.max ?? 600;
    this.roadRenderer = new RoadRenderer(this, maxDraw);
    this.roadside = new RoadsideSprites(this, SPRITE_POOL);
    this.controls = new DriveControls(this, { gas: t('gas'), brake: t('brake') });

    this.cockpit = new Cockpit(this, getTuning(this.ctx.tuning, 'cockpit.speedoMax'), getTuning(this.ctx.tuning, 'car.redline'),
      getTuning(this.ctx.tuning, 'car.fuelLampAt'));
    const sg = this.signals;
    sg.dir = 0;
    this.shownBlink = false;
    // Звук разрешается только после жеста — разблокируем при любом касании или клавише
    const sfx = new Sfx();
    this.sfx = sfx;
    this.input.on('pointerdown', () => sfx.unlock());
    this.input.on('pointerup', () => sfx.unlock());
    this.input.keyboard?.on('keydown', () => sfx.unlock());
    this.mirrors = new Mirrors(this);
    this.hud = new DriveHud(this, this.controls, () => this.scene.start('menu'));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.roadRenderer.destroy();
      this.roadside.destroy();
      this.sfx.destroy();
    });
  }

  private tick = (dt: number): void => {
    readRoadContext(this.roadCtx, this.road, this.car.z, this.laneWidth);
    this.roadCtx.grip = this.weather.effects.grip;
    stepCar(this.car, this.carInput, this.carParams, this.roadCtx, dt);
    stepSignals(this.signals, this.signalParams, dt, this.car.steer, this.car.x);
    this.weather.step(dt, this.car.speed, this.controls.wipers);
    const st = this.ctx.state;
    st.timeOfDay = advanceClock(st.timeOfDay, dt, this.timeSpeed);
  };

  override update(time: number, deltaMs: number): void {
    const tn = this.ctx.tuning;
    readCarParams(this.carParams, tn);
    this.weather.update(this.ctx.state.weather, tn);
    this.laneWidth = getTuning(tn, 'road.laneWidth');
    this.timeSpeed = getTuning(tn, 'world.timeSpeed');
    this.controls.read(this.carInput, tn, deltaMs / 1000);
    this.hud.update();
    const sp = this.signalParams;
    sp.blinkPeriod = getTuning(tn, 'cockpit.blinkPeriod');
    sp.armSteer = getTuning(tn, 'cockpit.signalArmSteer');
    sp.laneChange = getTuning(tn, 'cockpit.signalLaneChange');
    const lever = this.controls.takeSignal();
    if (lever !== 0) toggleSignal(this.signals, lever, this.car.x);
    advance(this.loop, deltaMs / 1000, this.tick);
    const car = this.car;
    this.updateSignalsAndSound(tn);

    this.projection.focal = focalFromFov(getTuning(tn, 'road.fieldOfView'), GAME_WIDTH);
    this.projection.horizonY = GAME_HEIGHT * getTuning(tn, 'render.horizon');
    const v = this.view;
    v.z = car.z;
    // Камера — на месте водителя (левее центра машины)
    v.x = car.x + getTuning(tn, 'cockpit.seatOffset');
    v.cameraHeight = getTuning(tn, 'road.cameraHeight');
    v.drawDistance = getTuning(tn, 'render.drawDistance');
    v.laneWidth = this.laneWidth;
    const lp = this.lightParams;
    lp.nightAmbient = getTuning(tn, 'light.nightAmbient');
    lp.lowRange = getTuning(tn, 'light.lowRange');
    lp.highRange = getTuning(tn, 'light.highRange');
    lp.beamIntensity = getTuning(tn, 'light.beamIntensity');
    lp.beamWidth = getTuning(tn, 'light.beamWidth');
    lp.beamFade = getTuning(tn, 'light.beamFade');
    const hour = this.ctx.state.timeOfDay;
    updateLighting(this.lighting, hour, this.controls.headlights, lp, this.weather.effects);
    this.sky.update(hour, this.projection.horizonY, GAME_WIDTH, this.lighting, this.weather.effects.overcast);
    this.roadRenderer.render(this.road, v, ROAD_PALETTE, this.lighting);
    // Тряска на обочине: детерминированные синусы, амплитуда растёт со скоростью
    let shake = 0;
    if (car.offroad && car.speed > 0.5) {
      const amp = getTuning(tn, 'render.shake') * Math.min(1, car.speed / this.carParams.offroadMaxSpeed);
      shake = amp * (Math.sin(time * 0.071) * 0.6 + Math.sin(time * 0.153) * 0.4);
    }
    this.roadRenderer.graphics.y = shake;
    const hgt = this.heights;
    hgt.tree = getTuning(tn, 'roadside.treeHeight');
    hgt.tree_round = getTuning(tn, 'roadside.treeRoundHeight');
    hgt.pole = getTuning(tn, 'roadside.poleHeight');
    hgt.sign = getTuning(tn, 'roadside.signHeight');
    this.roadside.render(this.road, this.roadRenderer.sprites, hgt, this.lighting, GAME_WIDTH, this.projection.centerX, shake);
    this.weather.render(time, car.speed);
    this.mirrors.render(this.road, car.z, car.x, v.cameraHeight, this.laneWidth, getTuning(tn, 'cockpit.mirrorSegments'),
      ROAD_PALETTE, this.lighting, this.sky.horizonColor);

    const minute = Math.floor(this.ctx.state.timeOfDay * 60);
    if (minute !== this.shownMinute) {
      this.shownMinute = minute;
      this.cockpit.setClock(formatClock(this.ctx.state.timeOfDay));
    }
    this.cockpit.update(car.speed * 3.6, car.steer * getTuning(tn, 'cockpit.wheelMaxAngle'), car.rpm, car.gear, this.carInput.manual);
    const st = this.ctx.state;
    const tank = getTuning(tn, 'car.tankSize');
    const ls = this.lampState;
    ls.low = this.controls.headlights === 1;
    ls.high = this.controls.headlights === 2;
    ls.fuel = st.fuel <= tank * getTuning(tn, 'car.fuelLampAt');
    ls.damage = false; // повреждения — M3
    this.cockpit.lamps.update(ls);
    this.cockpit.lamps.setFuel(st.fuel / tank);
    findCurveAhead(this.curveAhead, this.road, car.z, getTuning(tn, 'nav.lookahead'), getTuning(tn, 'nav.curveMin'));
    this.cockpit.navigator.update(this.curveAhead, getTuning(tn, 'nav.sharpCurve'), car.z);
    const d = this.ctx.debug;
    d.speed = car.speed;
    d.segment = segmentIndexAt(this.road, car.z);
    d.x = car.x;
    d.rpm = car.rpm;
    d.gear = car.gear;
  }

  /** Мигание ламп поворотников, щелчки реле, гудок. */
  private updateSignalsAndSound(tn: Tuning): void {
    const sfx = this.sfx;
    sfx.setVolume(getTuning(tn, 'audio.volume'));
    sfx.horn(this.controls.horn);
    const lit = signalLit(this.signals, this.signalParams.blinkPeriod);
    const ls = this.lampState;
    ls.left = lit && this.signals.dir < 0;
    ls.right = lit && this.signals.dir > 0;
    if (lit !== this.shownBlink) {
      this.shownBlink = lit;
      sfx.tick(lit);
    }
  }
}
