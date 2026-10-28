// Сводит сенсор, наклон и клавиатуру в CarInput.
import Phaser from 'phaser';
import type { CarInput } from '../core/car';
import { getTuning, type Tuning } from '../core/tuning';
import { smooth, tiltToSteer } from './controlMath';
import { KeyboardInput } from './Keyboard';
import { loadControlSettings, saveControlSettings, type ControlSettings, type SteerMode } from './settings';
import { TiltInput } from './TiltInput';
import { TouchControls, type TouchState } from './TouchControls';

export class DriveControls {
  readonly settings: ControlSettings;
  readonly touch: TouchControls;
  private readonly tilt = new TiltInput();
  private readonly keyboard: KeyboardInput;
  private readonly touchState: TouchState = { throttle: 0, brake: 0, steer: 0 };
  private tiltSteer = 0;
  private lastTiltActive = false;

  constructor(scene: Phaser.Scene, labels: { gas: string; brake: string }) {
    this.settings = loadControlSettings();
    this.touch = new TouchControls(scene, labels);
    this.keyboard = new KeyboardInput(scene);
    this.tilt.start();
    this.applyMode();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.tilt.stop());
  }

  /** Наклон выбран, но датчик молчит (компьютер, нет разрешения) — работают кнопки. */
  get tiltActive(): boolean {
    return this.settings.steerMode === 'tilt' && this.tilt.hasData;
  }

  get mode(): SteerMode {
    return this.settings.steerMode;
  }

  toggleMode(): void {
    this.settings.steerMode = this.settings.steerMode === 'tilt' ? 'buttons' : 'tilt';
    if (this.settings.steerMode === 'tilt') TiltInput.requestPermission();
    saveControlSettings(this.settings);
    this.applyMode();
  }

  /** Текущее положение телефона принять за «прямо». */
  calibrate(): void {
    if (this.tilt.roll === null) return;
    this.settings.tiltZero = this.tilt.roll;
    saveControlSettings(this.settings);
  }

  private applyMode(): void {
    this.touch.setSteerButtonsVisible(!this.tiltActive);
  }

  read(out: CarInput, tn: Tuning, dt: number): CarInput {
    // Датчик мог «проснуться» позже создания сцены
    this.applyModeIfChanged();
    const t = this.touch.read(this.touchState, getTuning(tn, 'input.pedalMin'));
    const kb = this.keyboard;
    out.throttle = Math.max(t.throttle, kb.throttle);
    out.brake = Math.max(t.brake, kb.brake);

    let steer = t.steer + kb.steer;
    if (this.tiltActive && this.tilt.roll !== null) {
      const raw = getTuning(tn, 'input.tiltSign') * tiltToSteer(
        this.tilt.roll,
        this.settings.tiltZero,
        getTuning(tn, 'input.tiltMaxAngle'),
        getTuning(tn, 'input.tiltDeadzone'),
      );
      this.tiltSteer = smooth(this.tiltSteer, raw, dt, getTuning(tn, 'input.tiltSmoothing'));
      steer += this.tiltSteer;
    }
    out.steer = steer < -1 ? -1 : steer > 1 ? 1 : steer;
    return out;
  }

  private applyModeIfChanged(): void {
    const active = this.tiltActive;
    if (active !== this.lastTiltActive) {
      this.lastTiltActive = active;
      this.applyMode();
    }
  }
}
