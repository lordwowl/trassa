// Кнопки экрана езды: верхний ряд (меню, руль, калибровка, КПП, фары), дворники и поворотники на панели,
// гудок на руле, ▲▼ передач на консоли.
// Подписи и видимость обновляются только при изменении режимов.
import Phaser from 'phaser';
import type { DriveControls } from '../../input/DriveControls';
import { DRIVER_X } from '../cockpit/Cockpit';
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
  private readonly wipers: Phaser.GameObjects.Container;
  private shownWipers = -1;
  private shownLights = -1;
  private shownTilt: boolean | null = null;
  private shownMode: string | null = null;
  private shownGearbox: string | null = null;

  constructor(scene: Phaser.Scene, controls: DriveControls, onMenu: () => void) {
    this.controls = controls;
    const top = { height: 72, fontSize: 26, color: GREY };
    // Верхний ряд обходит центральное зеркало (x 490–790)
    createButton(scene, 86, 52, t('menu'), onMenu, { ...top, width: 140 }).setDepth(HUD_DEPTH);
    this.mode = createButton(scene, 316, 52, '', () => controls.toggleMode(), { ...top, width: 300 }).setDepth(HUD_DEPTH);
    this.calibrate = createButton(scene, 316, 124, t('calibrate'), () => controls.calibrate(), { ...top, height: 56, width: 220, fontSize: 22 }).setDepth(HUD_DEPTH);
    this.gearbox = createButton(scene, 900, 52, '', () => controls.toggleTransmission(), { ...top, width: 200, fontSize: 22 }).setDepth(HUD_DEPTH);
    this.lights = createButton(scene, 1090, 52, '', () => controls.cycleHeadlights(), { ...top, width: 160, fontSize: 22 }).setDepth(HUD_DEPTH);
    // Дворники — на панели слева от приборов (GDD 5.1: «на панели — дворники»)
    this.wipers = createButton(scene, 196, 444, '', () => controls.cycleWipers(), { width: 170, height: 52, fontSize: 20, color: 0x2f3742 }).setDepth(HUD_DEPTH);
    // Рычаг поворотников — кнопки по сторонам от дворников; гудок — на руле (держать)
    const lever = { width: 84, height: 52, fontSize: 30, color: 0x2f3742 };
    createButton(scene, 54, 444, '◁', () => controls.requestSignal(-1), lever).setDepth(HUD_DEPTH);
    createButton(scene, 338, 444, '▷', () => controls.requestSignal(1), lever).setDepth(HUD_DEPTH);
    createButton(scene, DRIVER_X, 668, t('horn'), () => undefined, {
      width: 150, height: 64, fontSize: 24, color: 0x2a2e35, onHold: (down) => controls.setHornButton(down),
    }).setDepth(HUD_DEPTH);
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
    if (c.wipers !== this.shownWipers) {
      this.shownWipers = c.wipers;
      (this.wipers.getAt(1) as Phaser.GameObjects.Text).setText(c.wipers === 2 ? t('wipers2') : c.wipers === 1 ? t('wipers1') : t('wipers0'));
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
