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

/** Ёлка (128×256). Низ текстуры — земля, по нему ставится спрайт. */
export const tree: ProceduralDraw = (g) => {
  g.fillStyle(0x5b3d22).fillRect(56, 206, 16, 50);
  g.fillStyle(0x1f6b3f).fillTriangle(64, 0, 4, 220, 124, 220);
  g.fillStyle(0x2a8a50).fillTriangle(64, 16, 22, 150, 106, 150);
  g.fillStyle(0x35a160).fillTriangle(64, 30, 38, 90, 90, 90);
  return { width: 128, height: 256 };
};

/** Лиственное дерево (160×220). */
export const treeRound: ProceduralDraw = (g) => {
  g.fillStyle(0x6b4a2b).fillRect(72, 130, 16, 90);
  g.fillStyle(0x3f8f2f).fillCircle(80, 82, 70);
  g.fillStyle(0x4ea83a).fillCircle(56, 70, 40).fillCircle(106, 64, 36);
  g.fillStyle(0x62bd47).fillCircle(80, 44, 26);
  return { width: 160, height: 220 };
};

/** Столб ЛЭП с перекладиной (64×320). */
export const pole: ProceduralDraw = (g) => {
  g.fillStyle(0x7a6a58).fillRect(27, 0, 10, 320);
  g.fillStyle(0x5d5144).fillRect(2, 18, 60, 7);
  g.fillStyle(0xd9d9d9).fillRect(4, 10, 6, 9).fillRect(29, 10, 6, 9).fillRect(54, 10, 6, 9);
  return { width: 64, height: 320 };
};

/** Знак ограничения скорости (96×200, без цифр — цифры добавятся с лимитами в M4). */
export const signSpeed: ProceduralDraw = (g) => {
  g.fillStyle(0x8a9399).fillRect(44, 80, 8, 120);
  g.fillStyle(0xffffff).fillCircle(48, 46, 44);
  g.lineStyle(12, 0xd63a2a).strokeCircle(48, 46, 38);
  return { width: 96, height: 200 };
};

/** Человек с поднятой рукой. */
export const hitchhiker: ProceduralDraw = (g) => {
  g.fillStyle(0xf0c8a0).fillCircle(20, 12, 10);
  g.fillStyle(0x2980b9).fillRect(10, 24, 20, 34);
  g.fillStyle(0x2c3e50).fillRect(10, 58, 8, 30).fillRect(22, 58, 8, 30);
  g.fillStyle(0x2980b9).fillRect(30, 4, 6, 26);
  return { width: 40, height: 90 };
};
