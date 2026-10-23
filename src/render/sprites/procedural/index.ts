// Процедурные заглушки текстур (flat-стиль). Каждая рисует текстуру нужного ключа через Graphics.
import Phaser from 'phaser';

export type ProceduralDraw = (g: Phaser.GameObjects.Graphics) => { width: number; height: number };

/** Легковая машина сзади. */
export const carRear: ProceduralDraw = (g) => {
  g.fillStyle(0xc0392b).fillRoundedRect(4, 20, 112, 48, 10);
  g.fillStyle(0x922b21).fillRoundedRect(20, 0, 80, 30, 10);
  g.fillStyle(0x85c1e9).fillRect(28, 6, 64, 18);
  g.fillStyle(0xf1c40f).fillRect(10, 32, 20, 10).fillRect(90, 32, 20, 10);
  g.fillStyle(0xecf0f1).fillRect(46, 48, 28, 10);
  g.fillStyle(0x1b1b1b).fillRect(10, 66, 24, 14).fillRect(86, 66, 24, 14);
  return { width: 120, height: 80 };
};

/** Дерево. */
export const tree: ProceduralDraw = (g) => {
  g.fillStyle(0x6e4b2a).fillRect(26, 70, 12, 30);
  g.fillStyle(0x2e8b57).fillTriangle(32, 0, 0, 80, 64, 80);
  g.fillStyle(0x3cb371).fillTriangle(32, 10, 10, 60, 54, 60);
  return { width: 64, height: 100 };
};

/** Знак ограничения скорости (без цифр — цифры рисуются текстом). */
export const signSpeed: ProceduralDraw = (g) => {
  g.fillStyle(0x7f8c8d).fillRect(29, 60, 6, 60);
  g.fillStyle(0xffffff).fillCircle(32, 32, 30);
  g.lineStyle(8, 0xe74c3c).strokeCircle(32, 32, 26);
  return { width: 64, height: 120 };
};

/** Человек с поднятой рукой. */
export const hitchhiker: ProceduralDraw = (g) => {
  g.fillStyle(0xf0c8a0).fillCircle(20, 12, 10);
  g.fillStyle(0x2980b9).fillRect(10, 24, 20, 34);
  g.fillStyle(0x2c3e50).fillRect(10, 58, 8, 30).fillRect(22, 58, 8, 30);
  g.fillStyle(0x2980b9).fillRect(30, 4, 6, 26);
  return { width: 40, height: 90 };
};
