// Навигатор на торпедо над консолью (GDD 6): стрелка ближайшего поворота, расстояние до него
// и пройденный путь. Лимит скорости и предупреждения (АЗС, ДПС) — вместе со знаками и объектами (M4).
// Тексты создаются только при смене показанного значения.
import Phaser from 'phaser';
import type { CurveAhead } from '../../core/road';
import { t } from '../ui/strings';

const SCREEN = 0x0d2233;
const INK = 0xd8f1ff;

export class Navigator {
  private readonly icon: Phaser.GameObjects.Graphics;
  private readonly dist: Phaser.GameObjects.Text;
  private readonly trip: Phaser.GameObjects.Text;
  private shownIcon = NaN;
  private shownDist = NaN;
  private shownTrip = NaN;
  private readonly tripLabel = t('navTrip');

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, depth: number) {
    const g = scene.add.graphics().setDepth(depth);
    // Корпус на ножке-присоске
    g.fillStyle(0x0b0c0e).fillRect(x + w / 2 - 10, y + h - 4, 20, 14);
    g.fillStyle(0x1b1d22).fillRoundedRect(x, y, w, h, 10);
    g.lineStyle(2, 0x3a3f47).strokeRoundedRect(x, y, w, h, 10);
    g.fillStyle(SCREEN).fillRoundedRect(x + 6, y + 6, w - 12, h - 12, 6);
    const iconSize = h - 12;
    this.icon = scene.add.graphics({ x: x + 6 + iconSize / 2, y: y + h / 2 }).setDepth(depth + 1);
    const tx = x + iconSize + 10;
    const font = { fontFamily: 'sans-serif', color: '#d8f1ff' };
    this.dist = scene.add.text(tx, y + 12, '', { ...font, fontSize: '24px', fontStyle: 'bold' }).setDepth(depth + 1);
    this.trip = scene.add.text(tx, y + h - 30, '', { ...font, fontSize: '15px', color: '#8fb6cc' }).setDepth(depth + 1);
  }

  /** curve — ближайший поворот, sharp — порог «крутого», tripMeters — пройдено. */
  update(curve: CurveAhead, sharp: number, tripMeters: number): void {
    const kind = curve.dir === 0 ? 0 : curve.dir * (curve.strength >= sharp ? 2 : 1);
    if (kind !== this.shownIcon) {
      this.shownIcon = kind;
      drawIcon(this.icon, kind);
    }
    // Ближе 200 м — шаг 10 м, дальше 50 м; «сейчас» — уже в повороте
    const d = curve.dir === 0 ? -1 : curve.distance < 200 ? Math.round(curve.distance / 10) * 10 : Math.round(curve.distance / 50) * 50;
    if (d !== this.shownDist) {
      this.shownDist = d;
      this.dist.setText(d < 0 ? t('navStraight') : d === 0 ? t('navNow') : d >= 1000 ? `${(d / 1000).toFixed(1)} км` : `${d} м`);
    }
    const km = Math.floor(tripMeters / 100);
    if (km !== this.shownTrip) {
      this.shownTrip = km;
      this.trip.setText(`${this.tripLabel} ${(km / 10).toFixed(1)} км`);
    }
  }
}

/** 0 — прямо, ±1 — поворот, ±2 — крутой поворот (минус — налево). */
function drawIcon(g: Phaser.GameObjects.Graphics, kind: number): void {
  g.clear();
  g.lineStyle(7, INK);
  const dir = Math.sign(kind);
  if (dir === 0) {
    g.lineBetween(0, 22, 0, -10);
    g.fillStyle(INK).fillTriangle(0, -24, -12, -8, 12, -8);
    return;
  }
  // Стебель вверх и загиб в сторону поворота; крутой — загиб почти под прямым углом
  const sharp = Math.abs(kind) === 2;
  const ex = dir * (sharp ? 16 : 12);
  const ey = sharp ? -10 : -14;
  g.lineBetween(-dir * 8, 22, -dir * 8, 2);
  g.lineBetween(-dir * 8, 2, ex - dir * 6, ey + (sharp ? 0 : 4));
  const tipX = ex + dir * 8;
  if (sharp) g.fillStyle(INK).fillTriangle(tipX, ey, ex - dir * 4, ey - 11, ex - dir * 4, ey + 11);
  else g.fillStyle(INK).fillTriangle(tipX, ey - 8, ex - dir * 10, ey - 6, ex + dir * 2, ey + 8);
}
