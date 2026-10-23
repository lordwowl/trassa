// Общая заготовка для сцен-заглушек: фон, подпись, кнопка «Назад».
import Phaser from 'phaser';
import { getContext } from '../../context';
import { createButton } from '../ui/Button';
import { t, type StringKey } from '../ui/strings';

export abstract class StubScene extends Phaser.Scene {
  protected abstract readonly bg: string;
  protected abstract readonly textKey: StringKey;

  create(): void {
    getContext().debug.scene = this.scene.key;
    this.cameras.main.setBackgroundColor(this.bg);
    this.add.text(640, 300, t(this.textKey), { fontFamily: 'sans-serif', fontSize: '48px', color: '#ffffff' }).setOrigin(0.5);
    createButton(this, 160, 650, t('back'), () => this.scene.start('menu'), { width: 240, height: 88 });
  }
}

export class MapScene extends StubScene {
  protected readonly bg = '#2c5d3f';
  protected readonly textKey = 'mapStub';
  constructor() {
    super('map');
  }
}

export class CityScene extends StubScene {
  protected readonly bg = '#5d3f2c';
  protected readonly textKey = 'cityStub';
  constructor() {
    super('city');
  }
}
