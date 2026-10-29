// Процедурные машины трафика (flat-стиль): вид сзади (попутные) и спереди (встречные),
// для каждого цвета кузова — своя текстура. Масштаб 64 px на метр: пропорции = размерам из traffic.json.
import type Phaser from 'phaser';
import type { ProceduralDraw } from './index';

/** Цвета кузова (по индексу paint машины, по модулю). */
export const PAINTS = [0xc0392b, 0x2e86de, 0xe8ecef, 0x27ae60, 0xf1c40f, 0x7f8c8d, 0x34495e, 0xd35400] as const;

const DARK = 0x1b1d21;
const GLASS = 0x5f7d93;
const TAIL = 0xd2302a;
const HEAD = 0xfff4c8;
const PLATE = 0xeef1f3;

type G = Phaser.GameObjects.Graphics;
export type VehicleView = 'rear' | 'front';
type VehicleDraw = (g: G, paint: number) => { width: number; height: number };

function darker(c: number, k: number): number {
  const r = ((c >> 16) & 0xff) * k;
  const g = ((c >> 8) & 0xff) * k;
  const b = (c & 0xff) * k;
  return ((r | 0) << 16) | ((g | 0) << 8) | (b | 0);
}

// Легковая 1.75 × 1.45 м → 112 × 93
const carRear: VehicleDraw = (g, p) => {
  g.fillStyle(DARK).fillRect(8, 78, 22, 15).fillRect(82, 78, 22, 15);
  g.fillStyle(darker(p, 0.8)).fillRoundedRect(22, 6, 68, 40, 12);
  g.fillStyle(GLASS).fillRoundedRect(30, 12, 52, 26, 6);
  g.fillStyle(p).fillRoundedRect(2, 38, 108, 44, 10);
  g.fillStyle(TAIL).fillRect(6, 46, 22, 12).fillRect(84, 46, 22, 12);
  g.fillStyle(PLATE).fillRect(42, 60, 28, 10);
  g.fillStyle(DARK).fillRect(4, 74, 104, 8);
  return { width: 112, height: 93 };
};

const carFront: VehicleDraw = (g, p) => {
  g.fillStyle(DARK).fillRect(8, 78, 22, 15).fillRect(82, 78, 22, 15);
  g.fillStyle(darker(p, 0.8)).fillRoundedRect(20, 4, 72, 42, 12);
  g.fillStyle(GLASS).fillRoundedRect(26, 10, 60, 30, 6);
  g.fillStyle(p).fillRoundedRect(2, 38, 108, 44, 10);
  g.fillStyle(HEAD).fillRoundedRect(6, 48, 24, 11, 4).fillRoundedRect(82, 48, 24, 11, 4);
  g.fillStyle(DARK).fillRect(36, 50, 40, 12);
  g.fillStyle(PLATE).fillRect(42, 66, 28, 8);
  g.fillStyle(DARK).fillRect(4, 76, 104, 6);
  return { width: 112, height: 93 };
};

// Грузовик 2.5 × 3.6 м → 160 × 230: сзади — фургон, спереди — кабина
const truckRear: VehicleDraw = (g, p) => {
  g.fillStyle(DARK).fillRect(10, 204, 36, 26).fillRect(114, 204, 36, 26);
  g.fillStyle(0xd9dde1).fillRect(2, 0, 156, 196);
  g.lineStyle(3, 0x9aa1a8).lineBetween(80, 6, 80, 192).strokeRect(8, 6, 144, 186);
  g.fillStyle(p).fillRect(2, 150, 156, 12);
  g.fillStyle(DARK).fillRect(0, 196, 160, 12);
  g.fillStyle(TAIL).fillRect(4, 184, 22, 10).fillRect(134, 184, 22, 10);
  g.fillStyle(PLATE).fillRect(64, 198, 32, 9);
  return { width: 160, height: 230 };
};

const truckFront: VehicleDraw = (g, p) => {
  g.fillStyle(DARK).fillRect(10, 204, 36, 26).fillRect(114, 204, 36, 26);
  g.fillStyle(0xc4c9ce).fillRect(10, 0, 140, 40);
  g.fillStyle(p).fillRoundedRect(4, 34, 152, 168, 10);
  g.fillStyle(GLASS).fillRoundedRect(14, 50, 132, 62, 6);
  g.fillStyle(DARK).fillRect(40, 130, 80, 50);
  g.lineStyle(3, darker(p, 0.6));
  for (let y = 138; y < 178; y += 10) g.lineBetween(44, y, 116, y);
  g.fillStyle(HEAD).fillRoundedRect(10, 160, 24, 16, 4).fillRoundedRect(126, 160, 24, 16, 4);
  g.fillStyle(DARK).fillRect(0, 196, 160, 12);
  return { width: 160, height: 230 };
};

// Автобус 2.5 × 3.2 м → 160 × 205
const busRear: VehicleDraw = (g, p) => {
  g.fillStyle(DARK).fillRect(12, 184, 34, 21).fillRect(114, 184, 34, 21);
  g.fillStyle(p).fillRoundedRect(2, 0, 156, 186, 12);
  g.fillStyle(GLASS).fillRoundedRect(14, 14, 132, 60, 6);
  g.fillStyle(darker(p, 0.7)).fillRect(30, 100, 100, 40);
  g.lineStyle(3, DARK);
  for (let y = 108; y < 140; y += 8) g.lineBetween(36, y, 124, y);
  g.fillStyle(TAIL).fillRect(6, 150, 16, 24).fillRect(138, 150, 16, 24);
  g.fillStyle(PLATE).fillRect(64, 158, 32, 10);
  g.fillStyle(DARK).fillRect(0, 176, 160, 10);
  return { width: 160, height: 205 };
};

const busFront: VehicleDraw = (g, p) => {
  g.fillStyle(DARK).fillRect(12, 184, 34, 21).fillRect(114, 184, 34, 21);
  g.fillStyle(p).fillRoundedRect(2, 0, 156, 186, 12);
  g.fillStyle(DARK).fillRect(14, 8, 132, 18);
  g.fillStyle(0xffb020).fillRect(30, 12, 100, 10);
  g.fillStyle(GLASS).fillRoundedRect(10, 32, 140, 92, 6);
  g.fillStyle(HEAD).fillRoundedRect(10, 150, 26, 14, 4).fillRoundedRect(124, 150, 26, 14, 4);
  g.fillStyle(PLATE).fillRect(64, 160, 32, 9);
  g.fillStyle(DARK).fillRect(0, 176, 160, 10);
  return { width: 160, height: 205 };
};

const DRAWS: Record<string, Record<VehicleView, VehicleDraw>> = {
  car: { rear: carRear, front: carFront },
  truck: { rear: truckRear, front: truckFront },
  bus: { rear: busRear, front: busFront },
};

/** Ключ текстуры машины трафика. */
export function vehicleKey(kind: string, view: VehicleView, paint: number): string {
  return `veh_${kind}_${view}_${paint % PAINTS.length}`;
}

/** Все текстуры машин: ключ → генератор. Неизвестный вид рисуется как легковая. */
export function vehicleTextures(kinds: readonly string[]): Record<string, ProceduralDraw> {
  const out: Record<string, ProceduralDraw> = {};
  for (const kind of kinds) {
    const d = DRAWS[kind] ?? (DRAWS.car as Record<VehicleView, VehicleDraw>);
    for (const view of ['rear', 'front'] as const) {
      PAINTS.forEach((paint, i) => {
        out[vehicleKey(kind, view, i)] = (g) => d[view](g, paint);
      });
    }
  }
  return out;
}

/** Одно светящееся пятно (поворотник). */
export const blobGlow: ProceduralDraw = (g) => {
  for (let r = 16; r > 0; r -= 2) g.fillStyle(0xffffff, 0.1 + (1 - r / 16) * 0.6).fillCircle(16, 16, r);
  return { width: 32, height: 32 };
};

/** Свечение фонарей: два пятна по краям (белое — тонируется в красный или жёлтый). */
export const lightsGlow: ProceduralDraw = (g) => {
  for (const cx of [20, 108]) {
    for (let r = 20; r > 0; r -= 2) {
      g.fillStyle(0xffffff, 0.08 + (1 - r / 20) * 0.5).fillCircle(cx, 20, r);
    }
  }
  return { width: 128, height: 40 };
};
