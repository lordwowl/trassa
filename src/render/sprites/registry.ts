// Реестр текстур: если указан файл — грузим его, иначе (или при ошибке загрузки) рисуем заглушку.
// Замена заглушки на картинку = положить файл в public/assets и прописать file в нужной строке.
import Phaser from 'phaser';
import trafficData from '../../data/traffic.json';
import { carRear, hitchhiker, pole, signSpeed, tree, treeRound, type ProceduralDraw } from './procedural';
import { blobGlow, lightsGlow, vehicleTextures } from './procedural/vehicles';

export interface TextureEntry {
  /** Путь относительно корня сайта, например 'assets/cars/rear_red.png'. */
  file?: string;
  procedural: ProceduralDraw;
}

export const TEXTURES = {
  car_rear: { procedural: carRear },
  tree: { procedural: tree },
  tree_round: { procedural: treeRound },
  pole: { procedural: pole },
  sign_speed: { procedural: signSpeed },
  hitchhiker: { procedural: hitchhiker },
  lights_glow: { procedural: lightsGlow },
  blob_glow: { procedural: blobGlow },
} satisfies Record<string, TextureEntry>;

export type TextureKey = keyof typeof TEXTURES;

/**
 * Машины трафика: veh_<вид>_<rear|front>_<цвет>, по виду на каждый цвет из PAINTS.
 * Чтобы заменить картинкой, добавьте ключ в VEHICLE_FILES: 'veh_car_rear_0': 'assets/cars/car_rear_red.png'.
 */
const VEHICLE_FILES: Record<string, string> = {};

const entries: Record<string, TextureEntry> = { ...(TEXTURES as Record<string, TextureEntry>) };
for (const [key, draw] of Object.entries(vehicleTextures(trafficData.kinds.map((k) => k.id)))) {
  const file = VEHICLE_FILES[key];
  entries[key] = file ? { file, procedural: draw } : { procedural: draw };
}

/** Вызывать в preload(): ставит в очередь файлы, для которых они указаны. */
export function queueTextureFiles(scene: Phaser.Scene): void {
  for (const [key, e] of Object.entries(entries)) {
    if (e.file) scene.load.image(key, e.file);
  }
}

/** Вызывать в create(): генерирует заглушки для всех ключей, текстур которых нет. */
export function ensureTextures(scene: Phaser.Scene): string[] {
  const generated: string[] = [];
  for (const [key, e] of Object.entries(entries)) {
    if (scene.textures.exists(key)) continue;
    const g = scene.make.graphics({}, false);
    const { width, height } = e.procedural(g);
    g.generateTexture(key, width, height);
    g.destroy();
    generated.push(key);
  }
  return generated;
}
