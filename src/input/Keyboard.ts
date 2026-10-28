// Клавиатура для десктопа: ↑/W — газ, ↓/S/пробел — тормоз, ←/→ или A/D — руль, Shift/E — передача вверх, Ctrl/Q — вниз.
import Phaser from 'phaser';

const K = Phaser.Input.Keyboard.KeyCodes;

export class KeyboardInput {
  private readonly keys: Phaser.Input.Keyboard.Key[][] | null;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    this.keys = kb
      ? [
          [kb.addKey(K.UP), kb.addKey(K.W)],
          [kb.addKey(K.DOWN), kb.addKey(K.S), kb.addKey(K.SPACE)],
          [kb.addKey(K.LEFT), kb.addKey(K.A)],
          [kb.addKey(K.RIGHT), kb.addKey(K.D)],
          [kb.addKey(K.SHIFT), kb.addKey(K.E)],
          [kb.addKey(K.CTRL), kb.addKey(K.Q)],
        ]
      : null;
  }

  private down(group: number): boolean {
    const g = this.keys?.[group];
    if (!g) return false;
    for (let i = 0; i < g.length; i++) if ((g[i] as Phaser.Input.Keyboard.Key).isDown) return true;
    return false;
  }

  private justDown(group: number): boolean {
    const g = this.keys?.[group];
    if (!g) return false;
    let hit = false;
    // JustDown сбрасывает флаг — опрашиваем все клавиши группы
    for (let i = 0; i < g.length; i++) if (Phaser.Input.Keyboard.JustDown(g[i] as Phaser.Input.Keyboard.Key)) hit = true;
    return hit;
  }

  /** Запрос переключения передачи за этот кадр: +1, −1 или 0. */
  shiftRequest(): number {
    return (this.justDown(4) ? 1 : 0) - (this.justDown(5) ? 1 : 0);
  }

  get throttle(): number {
    return this.down(0) ? 1 : 0;
  }

  get brake(): number {
    return this.down(1) ? 1 : 0;
  }

  get steer(): number {
    return (this.down(3) ? 1 : 0) - (this.down(2) ? 1 : 0);
  }
}
