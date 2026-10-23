import Phaser from 'phaser';
import { getContext } from '../../context';
import { ensureTextures, queueTextureFiles } from '../sprites/registry';
import { t } from '../ui/strings';
import { mountDebugPanel } from '../ui/DebugPanel';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.add.text(640, 360, t('loading'), { fontFamily: 'sans-serif', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5);
    queueTextureFiles(this);
  }

  create(): void {
    ensureTextures(this);
    const ctx = getContext();
    if (ctx.config.debug) {
      this.scene.launch('debug');
      mountDebugPanel(ctx.tuning);
    }
    this.scene.start(ctx.config.scene);
  }
}
