// Погода в сцене езды: эффекты (дымка, пасмурность, сцепление) и стекло с каплями и дворниками.
import Phaser from 'phaser';
import { createRng, hashSeed, type RngState } from '../../core/rng';
import { getTuning, type Tuning } from '../../core/tuning';
import type { Weather } from '../../core/types';
import {
  createWeatherEffects,
  createWindshield,
  stepWindshield,
  weatherEffects,
  type WeatherParams,
  type Windshield,
  type WindshieldParams,
} from '../../core/world';
import { DASH_TOP, DRIVER_X } from '../cockpit/Cockpit';
import { WindshieldLayer } from '../cockpit/Windshield';

/** Капель на стекле одновременно, не больше. */
const DROP_POOL = 260;

export class DriveWeather {
  readonly effects = createWeatherEffects();
  private readonly params: WeatherParams = { rainVisibility: 400, heavyVisibility: 200, fogVisibility: 70, snowVisibility: 150, wetGrip: 0.75, snowGrip: 0.55 };
  private readonly shield: Windshield = createWindshield(DROP_POOL);
  private readonly shieldParams: WindshieldParams;
  private readonly rng: RngState;
  private readonly layer: WindshieldLayer;

  constructor(scene: Phaser.Scene, seed: number) {
    const bottom = DASH_TOP + 60;
    // Левый руль: щётка водителя от оси левее центра, вторая — правее
    this.shieldParams = {
      width: 1280,
      height: bottom,
      dropRate: 40,
      speedFactor: 0.6,
      wiperSweep: 2.3,
      wiperSlow: 1.6,
      wiperFast: 0.8,
      wipers: [
        { px: DRIVER_X - 120, py: bottom, length: 440, rInner: 30 },
        { px: DRIVER_X + 330, py: bottom, length: 440, rInner: 30 },
      ],
    };
    this.rng = createRng(hashSeed(`windshield:${seed}`));
    this.layer = new WindshieldLayer(scene, this.shieldParams);
  }

  /** Раз в кадр: параметры из тюнинга и эффекты текущей погоды. */
  update(weather: Weather, tn: Tuning): void {
    const p = this.params;
    p.rainVisibility = getTuning(tn, 'weather.rainVisibility');
    p.heavyVisibility = getTuning(tn, 'weather.heavyVisibility');
    p.fogVisibility = getTuning(tn, 'weather.fogVisibility');
    p.snowVisibility = getTuning(tn, 'weather.snowVisibility');
    p.wetGrip = getTuning(tn, 'weather.wetGrip');
    p.snowGrip = getTuning(tn, 'weather.snowGrip');
    const s = this.shieldParams;
    s.dropRate = getTuning(tn, 'windshield.dropRate');
    s.speedFactor = getTuning(tn, 'windshield.speedFactor');
    s.wiperSlow = getTuning(tn, 'windshield.wiperSlow');
    s.wiperFast = getTuning(tn, 'windshield.wiperFast');
    weatherEffects(this.effects, weather, p);
  }

  /** Шаг симуляции стекла (фиксированный шаг). */
  step(dt: number, speed: number, wipers: number): void {
    stepWindshield(this.shield, this.shieldParams, this.effects.rain, speed, wipers, this.rng, dt);
  }

  render(time: number, speed: number): void {
    this.layer.render(this.shield, this.shieldParams, this.effects.rain, speed, time);
  }
}
