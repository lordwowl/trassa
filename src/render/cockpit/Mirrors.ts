// Три зеркала: центральное под крышей и два боковых у стоек (GDD 6).
// Позже (M3) в них появятся машины позади.
import Phaser from 'phaser';
import type { Road } from '../../core/road';
import type { Lighting } from '../road/lighting';
import type { RoadPalette } from '../road/RoadRenderer';
import { MirrorView } from './MirrorView';

const DEPTH = 41;

export class Mirrors {
  private readonly views: MirrorView[];

  constructor(scene: Phaser.Scene) {
    // Крепление центрального зеркала к крыше
    scene.add.graphics().setDepth(DEPTH).fillStyle(0x1c1e22).fillRect(632, 0, 16, 24);
    this.views = [
      new MirrorView(scene, { x: 490, y: 20, w: 300, h: 70, offsetX: 0, yaw: 0, horizon: 0.42 }, DEPTH),
      new MirrorView(scene, { x: 18, y: 280, w: 170, h: 66, offsetX: -0.9, yaw: 0.35, horizon: 0.45 }, DEPTH),
      new MirrorView(scene, { x: 1092, y: 236, w: 170, h: 66, offsetX: 0.9, yaw: -0.35, horizon: 0.45 }, DEPTH),
    ];
  }

  render(road: Road, carZ: number, carX: number, cameraHeight: number, laneWidth: number, segments: number,
    pal: RoadPalette, lit: Lighting, skyColor: number): void {
    for (let i = 0; i < this.views.length; i++) {
      (this.views[i] as MirrorView).render(road, carZ, carX, cameraHeight, laneWidth, segments, pal, lit, skyColor);
    }
  }
}
