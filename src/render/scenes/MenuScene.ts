import Phaser from 'phaser';
import { getContext } from '../../context';
import { enterFullscreenLandscape } from '../fullscreen';
import { createButton } from '../ui/Button';
import { t } from '../ui/strings';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create(): void {
    getContext().debug.scene = 'menu';
    this.cameras.main.setBackgroundColor('#16324f');
    this.add.text(640, 170, t('title'), { fontFamily: 'sans-serif', fontSize: '110px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(640, 260, t('subtitle'), { fontFamily: 'sans-serif', fontSize: '30px', color: '#9fb7cc' }).setOrigin(0.5);

    createButton(this, 640, 400, t('play'), () => {
      enterFullscreenLandscape(this);
      this.scene.start('drive');
    }, { width: 420, height: 120, color: 0x27ae60, fontSize: 56 });
    createButton(this, 500, 560, t('map'), () => this.scene.start('map'), { width: 240 });
    createButton(this, 780, 560, t('city'), () => this.scene.start('city'), { width: 240 });
  }
}
