// Debug-оверлей (?debug=1): FPS и телеметрия поверх всех сцен.
import Phaser from 'phaser';
import { getContext, type GameContext } from '../../context';

const REFRESH_MS = 250;

function fmtTime(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

export class DebugScene extends Phaser.Scene {
  private ctx!: GameContext;
  private text!: Phaser.GameObjects.Text;
  private sinceRefresh = 0;

  constructor() {
    super('debug');
  }

  create(): void {
    this.ctx = getContext();
    this.text = this.add
      .text(8, 160, '', { fontFamily: 'monospace', fontSize: '16px', color: '#00ff88', backgroundColor: 'rgba(0,0,0,0.55)', padding: { x: 6, y: 4 } })
      .setDepth(1000);
    this.scene.bringToTop();
  }

  override update(_time: number, deltaMs: number): void {
    // Текст пересобирается 4 раза в секунду, а не каждый кадр
    this.sinceRefresh += deltaMs;
    if (this.sinceRefresh < REFRESH_MS) return;
    this.sinceRefresh = 0;
    this.scene.bringToTop();

    const { debug: d, state: s, config: c } = this.ctx;
    const lines = [
      `FPS ${this.game.loop.actualFps.toFixed(0)}  scene ${d.scene}  seed ${s.seed}`,
      `v ${(d.speed * 3.6).toFixed(0)} км/ч  rpm ${d.rpm.toFixed(0)}  gear ${d.gear}`,
      `seg ${d.segment}  x ${d.x.toFixed(2)}`,
      `weather ${s.weather}  time ${fmtTime(s.timeOfDay)}`,
      `car ${s.carId}  money ${s.money}  fuel ${s.fuel.toFixed(1)} л  damage ${s.damage.toFixed(0)}%`,
    ];
    for (const w of c.warnings) lines.push(`! ${w}`);
    this.text.setText(lines);
  }
}
