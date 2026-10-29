// Машины трафика на дороге: пул картинок кузова и свечения фонарей, без аллокаций в кадре.
// Попутные видны сзади, встречные — спереди. Освещение и дымка — как у придорожных объектов;
// в темноте и тумане горят задние (красные) и передние (жёлтые) фонари.
import Phaser from 'phaser';
import type { TrafficCar, TrafficKind, TrafficState } from '../../core/traffic';
import { fogAmount } from '../../core/world';
import { vehicleKey, PAINTS } from '../sprites/procedural/vehicles';
import { depthForDistance } from './depth';
import { shadeNoFog, type Lighting } from './lighting';
import type { RoadPoint, RoadRenderer } from './RoadRenderer';

/** Высота фонарей от земли, доля высоты машины: [сзади, спереди] по виду. */
const LIGHT_HEIGHT: Record<string, readonly [number, number]> = {
  car: [0.42, 0.4],
  truck: [0.12, 0.17],
  bus: [0.2, 0.22],
};
const TAIL_TINT = 0xff3020;
const HEAD_TINT = 0xfff0b0;

export class TrafficSprites {
  private readonly bodies: Phaser.GameObjects.Image[] = [];
  private readonly glows: Phaser.GameObjects.Image[] = [];
  private readonly shownKey: string[] = [];
  /** Ключи текстур [вид][0 — сзади, 1 — спереди][цвет] — без сборки строк в кадре. */
  private readonly keys: string[][][];
  private readonly lightY: number[][];
  private readonly pt: RoadPoint = { x: 0, y: 0, scale: 0, clip: 0 };

  constructor(scene: Phaser.Scene, size: number, kinds: readonly TrafficKind[]) {
    this.keys = kinds.map((k) => [0, 1].map((v) => PAINTS.map((_, p) => vehicleKey(k.id, v === 0 ? 'rear' : 'front', p))));
    this.lightY = kinds.map((k) => [...(LIGHT_HEIGHT[k.id] ?? LIGHT_HEIGHT.car!)]);
    const first = this.keys[0]![0]![0]!;
    for (let i = 0; i < size; i++) {
      this.bodies.push(scene.add.image(0, 0, first).setOrigin(0.5, 1).setVisible(false));
      this.glows.push(scene.add.image(0, 0, 'lights_glow').setBlendMode(Phaser.BlendModes.ADD).setVisible(false));
      this.shownKey.push(first);
    }
  }

  /**
   * playerZ — позиция камеры вдоль трассы; lightsOn — сила свечения фонарей 0..1 (ночь, туман).
   */
  render(t: TrafficState, kinds: readonly TrafficKind[], playerZ: number, road: RoadRenderer, lit: Lighting,
    lightsOn: number, screenW: number, centerX: number, yOffset: number): void {
    let used = 0;
    const cars = t.cars;
    const pt = this.pt;
    for (let i = 0; i < cars.length && used < this.bodies.length; i++) {
      const c = cars[i] as TrafficCar;
      if (!c.active) continue;
      // Расстояние до ближней к нам стороны машины
      const d = c.z - playerZ - c.length / 2;
      if (!road.projectOnRoad(pt, d, c.x)) continue;
      const k = kinds[c.kind] as TrafficKind;
      const w = k.width * pt.scale;
      const h = k.height * pt.scale;
      const top = pt.y - h;
      if (h < 2 || top >= pt.clip || pt.x + w / 2 < 0 || pt.x - w / 2 > screenW) continue;
      const img = this.bodies[used] as Phaser.GameObjects.Image;
      const view = c.dir > 0 ? 0 : 1;
      const key = this.keys[c.kind]![view]![c.paint % PAINTS.length]!;
      if (this.shownKey[used] !== key) {
        img.setTexture(key);
        this.shownKey[used] = key;
      }
      img.setDisplaySize(w, h);
      img.setPosition(pt.x, pt.y + yOffset);
      const fh = img.frame.height;
      if (pt.y > pt.clip) img.setCrop(0, 0, img.frame.width, (fh * (pt.clip - top)) / h);
      else if (img.isCropped) img.setCrop();
      img.setTint(shadeNoFog(0xffffff, lit, d, (pt.x - centerX) / pt.scale));
      const fog = fogAmount(d, lit.visibility);
      img.setAlpha(1 - fog);
      const depth = depthForDistance(d);
      img.setDepth(depth);
      img.setVisible(true);

      // Фонари: видны сквозь дымку дальше, чем кузов
      const glow = this.glows[used] as Phaser.GameObjects.Image;
      const ly = pt.y - h * (this.lightY[c.kind]![view] as number);
      if (lightsOn > 0.02 && ly < pt.clip) {
        glow.setTint(view === 0 ? TAIL_TINT : HEAD_TINT);
        glow.setDisplaySize(w * 1.15, Math.max(3, h * (view === 0 ? 0.22 : 0.3)));
        glow.setPosition(pt.x, ly + yOffset);
        glow.setAlpha(lightsOn * (1 - fog * 0.6) * (view === 0 ? 0.9 : 1));
        glow.setDepth(depth + 1e-6);
        glow.setVisible(true);
      } else if (glow.visible) glow.setVisible(false);
      used++;
    }
    for (let i = used; i < this.bodies.length; i++) {
      const b = this.bodies[i] as Phaser.GameObjects.Image;
      if (b.visible) b.setVisible(false);
      const g = this.glows[i] as Phaser.GameObjects.Image;
      if (g.visible) g.setVisible(false);
    }
  }

  destroy(): void {
    for (const img of this.bodies) img.destroy();
    for (const img of this.glows) img.destroy();
  }
}
