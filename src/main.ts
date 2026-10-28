import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, getLaunchConfig } from './config';
import { setContext } from './context';
import { entropySeed } from './core/rng';
import { createGameState } from './core/state';
import { createTuning, parseTuningData } from './core/tuning';
import rawTuning from './data/tuning.json';
import { BootScene } from './render/scenes/BootScene';
import { DebugScene } from './render/scenes/DebugScene';
import { DriveScene } from './render/scenes/DriveScene';
import { MenuScene } from './render/scenes/MenuScene';
import { CityScene, MapScene } from './render/scenes/StubScene';
import { loadTuningOverrides } from './render/ui/DebugPanel';
import { watchViewport } from './render/viewport';

const config = getLaunchConfig();
// Переопределения из debug-панели действуют только в debug-режиме; канонические значения — tuning.json
const tuning = createTuning(parseTuningData(rawTuning), config.debug ? loadTuningOverrides() : {});
const seed = config.seed ?? entropySeed();

setContext({
  config,
  tuning,
  state: createGameState({
    seed,
    carId: config.car,
    money: config.money,
    fuel: config.fuel,
    timeOfDay: config.time,
    weather: config.weather,
  }),
  debug: { scene: 'boot', speed: 0, rpm: 0, gear: 1, segment: 0, x: 0 },
});

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#101820',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Fullscreen на контейнер, чтобы DOM-оверлеи (debug-панель) оставались видны
    fullscreenTarget: 'game',
  },
  // Руль + газ + тормоз + запас
  input: { activePointers: 4 },
  fps: { target: 60 },
  scene: [BootScene, MenuScene, DriveScene, MapScene, CityScene, DebugScene],
});

watchViewport(game);

// Для отладки с компьютера (консоль, автотесты в браузере): только при ?debug=1
if (config.debug) (globalThis as { __trassaGame?: Phaser.Game }).__trassaGame = game;
