// Придорожные объекты: пул картинок без аллокаций в кадре.
// Порядок — от дальних к ближним (depth растёт), объекты за гребнем холма обрезаются снизу.
import Phaser from 'phaser';
import type { Road, RoadObjectKind, RoadSegment } from '../../core/road';
import { shade, type Lighting } from './lighting';
import type { SpriteSegments } from './RoadRenderer';

/** Вид объекта → ключ текстуры из render/sprites/registry.ts. */
const TEXTURE: Record<RoadObjectKind, string> = {
  tree: 'tree',
  tree_round: 'tree_round',
  pole: 'pole',
  sign: 'sign_speed',
};

/** Базовая высота вида, м (из tuning.json). */
export type KindHeights = Record<RoadObjectKind, number>;

/** Слой спрайтов: над дорогой (depth 0), под кабиной (40). */
const DEPTH_BASE = 1;
const DEPTH_STEP = 1e-4;

export class RoadsideSprites {
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private readonly keys: string[] = [];

  constructor(scene: Phaser.Scene, size: number) {
    for (let i = 0; i < size; i++) {
      const img = scene.add.image(0, 0, 'tree').setOrigin(0.5, 1).setVisible(false);
      this.pool.push(img);
      this.keys.push('tree');
    }
  }

  render(road: Road, sp: SpriteSegments, heights: KindHeights, lit: Lighting, screenW: number, yOffset: number): void {
    let used = 0;
    const pool = this.pool;
    // От дальних к ближним: ближние получают больший depth и рисуются поверх
    for (let k = sp.count - 1; k >= 0 && used < pool.length; k--) {
      const seg = road.segments[sp.segment[k] as number] as RoadSegment;
      const objects = seg.objects;
      if (!objects) continue;
      const scale = sp.scale[k] as number;
      const baseX = sp.x[k] as number;
      const baseY = sp.y[k] as number;
      const clip = sp.clip[k] as number;
      // Освещение по расстоянию: ночью вне фар — силуэты
      const tint = shade(0xffffff, lit, sp.z[k] as number);
      for (let j = 0; j < objects.length && used < pool.length; j++) {
        const o = objects[j]!;
        const h = heights[o.kind] * o.scale * scale;
        const top = baseY - h;
        // Слишком мелкий или целиком за холмом
        if (h < 2 || top >= clip) continue;
        const img = pool[used] as Phaser.GameObjects.Image;
        const key = TEXTURE[o.kind];
        if (this.keys[used] !== key) {
          img.setTexture(key);
          this.keys[used] = key;
        }
        const fw = img.frame.width;
        const fh = img.frame.height;
        const w = (h * fw) / fh;
        const sx = baseX + o.x * scale;
        if (sx + w / 2 < 0 || sx - w / 2 > screenW) continue;
        img.setDisplaySize(w, h);
        img.setPosition(sx, baseY + yOffset);
        // Низ за холмом — обрезаем по линии clip
        if (baseY > clip) img.setCrop(0, 0, fw, (fh * (clip - top)) / h);
        else if (img.isCropped) img.setCrop();
        img.setTint(tint);
        img.setDepth(DEPTH_BASE + used * DEPTH_STEP);
        img.setVisible(true);
        used++;
      }
    }
    for (let i = used; i < pool.length; i++) {
      const img = pool[i] as Phaser.GameObjects.Image;
      if (img.visible) img.setVisible(false);
    }
  }

  destroy(): void {
    for (const img of this.pool) img.destroy();
  }
}
