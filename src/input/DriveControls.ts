// Сводит сенсор, наклон и клавиатуру в CarInput.
import Phaser from 'phaser';
import type { CarInput } from '../core/car';
import { getTuning, type Tuning } from '../core/tuning';
import { smooth, tiltToSteer } from './controlMath';
import { KeyboardInput } from './Keyboard';
import { loadControlSettings, saveControlSettings, type ControlSettings, type SteerMode, type Transmission } from './settings';
import { TiltInput } from './TiltInput';
import { TouchControls, type TouchState } from './TouchControls';

/** Фары: 0 — выкл, 1 — ближний, 2 — дальний. */
export type HeadlightMode = 0 | 1 | 2;

export class DriveControls {
  readonly settings: ControlSettings;
  readonly touch: TouchControls;
  private readonly tilt = new TiltInput();
  private readonly keyboard: KeyboardInput;
  private readonly touchState: TouchState = { throttle: 0, brake: 0, steer: 0 };
  private tiltSteer = 0;
  private lastTiltActive = false;
  /** Запрос переключения от кнопок ▲▼ или клавиатуры, ждёт шага физики. */
  private pendingShift = 0;
  /** Фары — состояние машины в рейсе, не настройка: в начале выключены. */
  headlights: HeadlightMode = 0;
  /** Дворники: 0 — выкл, 1 — медленно, 2 — быстро. */
  wipers: 0 | 1 | 2 = 0;
  /** Нажатие рычага поворотника, ждёт кадра сцены: −1, 1 или 0. */
  private pendingSignal = 0;
  /** Кнопка гудка удерживается. */
  private hornButton = false;

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

  get transmission(): Transmission {
    return this.settings.transmission;
  }

  toggleTransmission(): void {
    this.settings.transmission = this.settings.transmission === 'auto' ? 'manual' : 'auto';
    this.pendingShift = 0;
    saveControlSettings(this.settings);
  }

  cycleWipers(): void {
    this.wipers = this.wipers === 0 ? 1 : this.wipers === 1 ? 2 : 0;
  }

  cycleHeadlights(): void {
    this.headlights = this.headlights === 0 ? 1 : this.headlights === 1 ? 2 : 0;
  }

  /** Кнопки ◁ ▷ на панели. */
  requestSignal(dir: number): void {
    this.pendingSignal = dir;
  }

  /** Забрать нажатие рычага поворотника (одно за кадр). */
  takeSignal(): number {
    const d = this.pendingSignal;
    this.pendingSignal = 0;
    return d;
  }

  setHornButton(down: boolean): void {
    this.hornButton = down;
  }

  get horn(): boolean {
    return this.hornButton || this.keyboard.horn;
  }

  /** Кнопки ▲▼ на консоли. */
  requestShift(dir: number): void {
    if (this.settings.transmission === 'manual') this.pendingShift = dir > 0 ? 1 : -1;
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
    out.manual = this.settings.transmission === 'manual';
    if (kb.lightsPressed()) this.cycleHeadlights();
    if (kb.wipersPressed()) this.cycleWipers();
    const keySignal = kb.signalPressed();
    if (keySignal !== 0) this.requestSignal(keySignal);
    const keyShift = kb.shiftRequest();
    if (keyShift !== 0) this.requestShift(keyShift);
    // Физика сбрасывает out.shift после обработки; новый запрос кладём, только когда прежний принят
    if (out.shift === 0 && this.pendingShift !== 0) {
      out.shift = this.pendingShift;
      this.pendingShift = 0;
    }
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
