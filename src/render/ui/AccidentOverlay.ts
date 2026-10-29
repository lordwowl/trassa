// Окно поверх езды: заголовок, текст и кнопки (авария, эвакуатор). Создаётся при показе, уничтожается при закрытии.
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { createButton } from './Button';

/** Над кабиной, HUD и зеркалами. */
const DEPTH = 90;

export interface OverlayButton {
  label: string;
  onClick: () => void;
}

export class AccidentOverlay {
  private container: Phaser.GameObjects.Container | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  get open(): boolean {
    return this.container !== null;
  }

  show(title: string, text: string, buttons: OverlayButton[]): void {
    this.hide();
    const s = this.scene;
    const items: Phaser.GameObjects.GameObject[] = [];
    // Затемнение и блокировка касаний под окном
    items.push(s.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72).setOrigin(0).setInteractive());
    items.push(s.add.rectangle(GAME_WIDTH / 2, 330, 860, 470, 0x1c1214, 0.96).setStrokeStyle(4, 0xc0392b));
    items.push(s.add.rectangle(GAME_WIDTH / 2, 130, 860, 70, 0xc0392b));
    items.push(s.add.text(GAME_WIDTH / 2, 130, title, { fontFamily: 'sans-serif', fontSize: '44px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5));
    items.push(s.add.text(GAME_WIDTH / 2, 320, text, {
      fontFamily: 'sans-serif', fontSize: '28px', color: '#f2e6e6', align: 'center', lineSpacing: 10, wordWrap: { width: 800 },
    }).setOrigin(0.5));
    const gap = 40;
    const w = buttons.length > 1 ? 360 : 420;
    const total = buttons.length * w + (buttons.length - 1) * gap;
    buttons.forEach((b, i) => {
      const x = GAME_WIDTH / 2 - total / 2 + w / 2 + i * (w + gap);
      items.push(createButton(s, x, 500, b.label, () => b.onClick(), { width: w, height: 84, fontSize: 32, color: i === 0 ? 0x2f7de1 : 0x52606d }));
    });
    this.container = s.add.container(0, 0, items).setDepth(DEPTH);
  }

  hide(): void {
    this.container?.destroy(true);
    this.container = null;
  }
}
