// Временное управление для проверки физики (M1.2). В M1.3 заменяется педалями, рулём и наклоном.
// Газ включён всегда. Сенсор: удержание левой/правой половины экрана — руль, два пальца — тормоз.
// Клавиатура: ←/→ или A/D — руль, ↓/S/пробел — тормоз.
import Phaser from 'phaser';
import type { CarInput } from '../core/car';

/** Область кнопки «Назад» (левый нижний угол) — касания там не рулят. */
const BACK_ZONE = { x: 300, y: 600 };

export class SimpleControls {
  private readonly scene: Phaser.Scene;
  private readonly keys: Record<'left' | 'right' | 'down' | 'a' | 'd' | 's' | 'space', Phaser.Input.Keyboard.Key> | null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard;
    this.keys = kb
      ? {
          left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
          right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
          down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
          a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
          d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
          s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
          space: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        }
      : null;
  }

  /** Заполняет out по текущему состоянию ввода (без аллокаций). */
  read(out: CarInput): CarInput {
    let steer = 0;
    let brake = 0;
    let touches = 0;
    const pointers = this.scene.input.manager.pointers;
    for (let i = 0; i < pointers.length; i++) {
      const p = pointers[i] as Phaser.Input.Pointer;
      if (!p.isDown || (p.x < BACK_ZONE.x && p.y > BACK_ZONE.y)) continue;
      touches++;
      steer += p.x < this.scene.scale.gameSize.width / 2 ? -1 : 1;
    }
    if (touches >= 2) {
      brake = 1;
      steer = 0;
    }
    const k = this.keys;
    if (k) {
      if (k.left.isDown || k.a.isDown) steer -= 1;
      if (k.right.isDown || k.d.isDown) steer += 1;
      if (k.down.isDown || k.s.isDown || k.space.isDown) brake = 1;
    }
    out.steer = steer < -1 ? -1 : steer > 1 ? 1 : steer;
    out.brake = brake;
    out.throttle = brake > 0 ? 0 : 1;
    return out;
  }
}
