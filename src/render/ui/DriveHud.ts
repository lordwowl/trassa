// Кнопки экрана езды: верхний ряд (меню, руль, калибровка, КПП) и ▲▼ передач на консоли.
// Подписи и видимость обновляются только при изменении режимов.
import Phaser from 'phaser';
import type { DriveControls } from '../../input/DriveControls';
import { createButton } from './Button';
import { t } from './strings';

/** Кнопки поверх кабины и педалей. */
const HUD_DEPTH = 60;
const GREY = 0x44515e;

export class DriveHud {
  private readonly controls: DriveControls;
  private readonly mode: Phaser.GameObjects.Container;
  private readonly calibrate: Phaser.GameObjects.Container;
  private readonly gearbox: Phaser.GameObjects.Container;
  private readonly shiftUp: Phaser.GameObjects.Container;
  private readonly shiftDown: Phaser.GameObjects.Container;
  private readonly lights: Phaser.GameObjects.Container;
  private shownLights = -1;
  private shownTilt: boolean | null = null;
  private shownMode: string | null = null;
  private shownGearbox: string | null = null;

  constructor(scene: Phaser.Scene, controls: DriveControls, onMenu: () => void) {
    this.controls = controls;
    const top = { height: 72, fontSize: 26, color: GREY };
    createButton(scene, 106, 52, t('menu'), onMenu, { ...top, width: 180, fontSize: 30 }).setDepth(HUD_DEPTH);
    this.mode = createButton(scene, 357, 52, '', () => controls.toggleMode(), { ...top, width: 290 }).setDepth(HUD_DEPTH);
    this.calibrate = createButton(scene, 628, 52, t('calibrate'), () => controls.calibrate(), { ...top, width: 220 }).setDepth(HUD_DEPTH);
    this.gearbox = createButton(scene, 875, 52, '', () => controls.toggleTransmission(), { ...top, width: 250 }).setDepth(HUD_DEPTH);
    this.lights = createButton(scene, 1092, 52, '', () => controls.cycleHeadlights(), { ...top, width: 164, fontSize: 22 }).setDepth(HUD_DEPTH);
    // ▲▼ «у рычага» — на центральной консоли (GDD 5.1), под часами
    const shift = { width: 140, height: 80, fontSize: 40, color: 0x3a4250 };
    this.shiftUp = createButton(scene, 805, 592, '▲', () => controls.requestShift(1), shift).setDepth(HUD_DEPTH);
    this.shiftDown = createButton(scene, 805, 680, '▼', () => controls.requestShift(-1), shift).setDepth(HUD_DEPTH);
  }

  update(): void {
    const c = this.controls;
    const tilt = c.tiltActive;
    const mode = c.mode;
    if (tilt !== this.shownTilt || mode !== this.shownMode) {
      this.shownTilt = tilt;
      this.shownMode = mode;
      (this.mode.getAt(1) as Phaser.GameObjects.Text).setText(
        mode === 'buttons' ? t('steerButtons') : tilt ? t('steerTilt') : t('steerTiltNoSensor'),
      );
      this.calibrate.setVisible(tilt);
    }
    if (c.headlights !== this.shownLights) {
      this.shownLights = c.headlights;
      (this.lights.getAt(1) as Phaser.GameObjects.Text).setText(
        c.headlights === 2 ? t('lightsHigh') : c.headlights === 1 ? t('lightsLow') : t('lightsOff'),
      );
    }
    const gb = c.transmission;
    if (gb !== this.shownGearbox) {
      this.shownGearbox = gb;
      (this.gearbox.getAt(1) as Phaser.GameObjects.Text).setText(gb === 'manual' ? t('gearManual') : t('gearAuto'));
      this.shiftUp.setVisible(gb === 'manual');
      this.shiftDown.setVisible(gb === 'manual');
    }
  }
}
