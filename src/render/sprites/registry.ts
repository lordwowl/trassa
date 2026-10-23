// Реестр текстур: если указан файл — грузим его, иначе (или при ошибке загрузки) рисуем заглушку.
// Замена заглушки на картинку = положить файл в public/assets и прописать file в нужной строке.
import Phaser from 'phaser';
import { carRear, hitchhiker, signSpeed, tree, type ProceduralDraw } from './procedural';

export interface TextureEntry {
  /** Путь относительно корня сайта, например 'assets/cars/rear_red.png'. */
  file?: string;
  procedural: ProceduralDraw;
}

export const TEXTURES = {
  car_rear: { procedural: carRear },
  tree: { procedural: tree },
  sign_speed: { procedural: signSpeed },
  hitchhiker: { procedural: hitchhiker },
} satisfies Record<string, TextureEntry>;

export type TextureKey = keyof typeof TEXTURES;

const entries = TEXTURES as Record<string, TextureEntry>;

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
