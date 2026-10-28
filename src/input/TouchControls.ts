// Сенсорное управление: педали газа и тормоза справа, кнопки руля слева (в режиме «кнопки»).
// Состояние читается из всех активных касаний каждый кадр — мультитач работает без событий.
import Phaser from 'phaser';
import { inRect, pedalValue, type Rect } from './controlMath';

export const LAYOUT = {
  gas: { x: 1110, y: 330, w: 154, h: 374 },
  brake: { x: 934, y: 450, w: 160, h: 254 },
  // Кнопки руля узкие: правее них — руль водителя (левый руль)
  left: { x: 16, y: 470, w: 120, h: 234 },
  right: { x: 146, y: 470, w: 120, h: 234 },
} satisfies Record<string, Rect>;

/** Запас вокруг зон, px: палец может немного съехать с педали. */
const MARGIN = 24;

export interface TouchState {
  throttle: number;
  brake: number;
  steer: number;
}

export class TouchControls {
  private readonly scene: Phaser.Scene;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly arrows: Phaser.GameObjects.Text[];
  private showSteer = true;
  /** Битовая маска нажатых зон для перерисовки только при изменении. */
  private drawnMask = -1;

  constructor(scene: Phaser.Scene, labels: { gas: string; brake: string }) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(50);
    const style = { fontFamily: 'sans-serif', fontStyle: 'bold', color: '#ffffff' };
    const center = (r: Rect, text: string, size: number): Phaser.GameObjects.Text =>
      scene.add.text(r.x + r.w / 2, r.y + r.h / 2, text, { ...style, fontSize: `${size}px` }).setOrigin(0.5).setDepth(51).setAlpha(0.85);
    center(LAYOUT.gas, labels.gas, 30);
    center(LAYOUT.brake, labels.brake, 26);
    this.arrows = [center(LAYOUT.left, '◀', 56), center(LAYOUT.right, '▶', 56)];
  }

  setSteerButtonsVisible(v: boolean): void {
    this.showSteer = v;
    for (const a of this.arrows) a.setVisible(v);
    this.drawnMask = -1;
  }

  /** Заполняет out по касаниям (без аллокаций). pedalMin — сила внизу педали. */
  read(out: TouchState, pedalMin: number): TouchState {
    out.throttle = 0;
    out.brake = 0;
    out.steer = 0;
    let mask = 0;
    const pointers = this.scene.input.manager.pointers;
    for (let i = 0; i < pointers.length; i++) {
      const p = pointers[i] as Phaser.Input.Pointer;
      if (!p.isDown) continue;
      if (inRect(LAYOUT.gas, p.x, p.y, MARGIN)) {
        out.throttle = Math.max(out.throttle, pedalValue(LAYOUT.gas, p.y, pedalMin));
        mask |= 1;
      } else if (inRect(LAYOUT.brake, p.x, p.y, MARGIN)) {
        out.brake = Math.max(out.brake, pedalValue(LAYOUT.brake, p.y, pedalMin));
        mask |= 2;
      } else if (this.showSteer && inRect(LAYOUT.left, p.x, p.y, MARGIN)) {
        out.steer -= 1;
        mask |= 4;
      } else if (this.showSteer && inRect(LAYOUT.right, p.x, p.y, MARGIN)) {
        out.steer += 1;
        mask |= 8;
      }
    }
    if (out.steer < -1) out.steer = -1;
    else if (out.steer > 1) out.steer = 1;
    if (mask !== this.drawnMask) this.draw(mask);
    return out;
  }

  private draw(mask: number): void {
    this.drawnMask = mask;
    const g = this.g;
    g.clear();
    const zone = (r: Rect, pressed: boolean, color: number): void => {
      g.fillStyle(color, pressed ? 0.75 : 0.35);
      g.fillRoundedRect(r.x, r.y, r.w, r.h, 18);
      g.lineStyle(3, 0xffffff, pressed ? 0.9 : 0.4);
      g.strokeRoundedRect(r.x, r.y, r.w, r.h, 18);
    };
    zone(LAYOUT.gas, (mask & 1) !== 0, 0x2e9e4f);
    zone(LAYOUT.brake, (mask & 2) !== 0, 0xb03a2e);
    if (this.showSteer) {
      zone(LAYOUT.left, (mask & 4) !== 0, 0x2f5f9e);
      zone(LAYOUT.right, (mask & 8) !== 0, 0x2f5f9e);
    }
  }
}
