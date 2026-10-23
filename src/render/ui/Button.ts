// Простая кнопка: прямоугольник + текст. Минимальная высота 48 dp (в базовом разрешении — больше).
import Phaser from 'phaser';

export interface ButtonOptions {
  width?: number;
  height?: number;
  color?: number;
  fontSize?: number;
}

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  o: ButtonOptions = {},
): Phaser.GameObjects.Container {
  const w = o.width ?? 320;
  const h = Math.max(o.height ?? 96, 72);
  const color = o.color ?? 0x2f7de1;
  const bg = scene.add.rectangle(0, 0, w, h, color).setStrokeStyle(4, 0xffffff, 0.25);
  const text = scene.add
    .text(0, 0, label, { fontFamily: 'sans-serif', fontSize: `${o.fontSize ?? 40}px`, color: '#ffffff', fontStyle: 'bold' })
    .setOrigin(0.5);
  const c = scene.add.container(x, y, [bg, text]);
  c.setSize(w, h);
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => bg.setFillStyle(Phaser.Display.Color.ValueToColor(color).darken(20).color));
  bg.on('pointerout', () => bg.setFillStyle(color));
  // pointerup — жест пользователя, нужен для requestFullscreen
  bg.on('pointerup', () => {
    bg.setFillStyle(color);
    onClick();
  });
  return c;
}
