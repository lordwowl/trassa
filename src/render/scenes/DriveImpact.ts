// Последствия ударов в сцене езды: повреждения (в машину и GameState), трещины, тряска, звук,
// лампа повреждений. Удары копятся в шагах физики, показываются в кадре. Авария и эвакуатор — DriveAccident.
import Phaser from 'phaser';
import type { Sfx } from '../../audio/Sfx';
import type { CarState } from '../../core/car';
import { createRng, hashSeed, next, range, type RngState } from '../../core/rng';
import type { GameState } from '../../core/state';
import type { CollisionResult } from '../../core/traffic';
import { Cracks } from '../cockpit/Cracks';
import { DASH_TOP } from '../cockpit/Cockpit';

/** Повреждения, с которых горит лампа, и с которых она мигает, %. */
const LAMP_ON = 30;
const LAMP_BLINK = 60;
/** Удар сильнее этого (м/с) бьёт стекло. */
const CRACK_IMPACT = 6;
/** Касание боком — трещина, если повреждений уже много. */
const SIDE_CRACK_DAMAGE = 50;

export class DriveImpact {
  private readonly cracks: Cracks;
  private readonly rng: RngState;
  /** Сильнейший удар с прошлого кадра. */
  private pendingImpact = 0;
  private pendingKind: CollisionResult['kind'] = 'none';
  private pendingDamage = 0;

  constructor(private readonly scene: Phaser.Scene, seed: number, initialDamage: number) {
    this.rng = createRng(hashSeed(`cracks:${seed}`));
    this.cracks = new Cracks(scene, this.rng);
    // Машина уже побита (?damage= или сохранение): трещины по числу «пятнадцати процентов»
    for (let i = 0; i < Math.floor(initialDamage / 15); i++) this.crackAt('front', 0.5);
  }

  /** Из шага физики: применить повреждение и запомнить удар для эффектов. */
  hit(r: CollisionResult, car: CarState, state: GameState): void {
    // Толкание и повторный скрежет без повреждений — без звука и тряски
    if (r.kind === 'none' || r.damage <= 0) return;
    car.damage = Math.min(100, car.damage + r.damage);
    state.damage = car.damage;
    if (r.impact >= this.pendingImpact) {
      this.pendingImpact = r.impact;
      this.pendingKind = r.kind;
    }
    this.pendingDamage += r.damage;
  }

  /** Раз в кадр: эффекты накопленных ударов. Возвращает, гореть ли лампе повреждений. */
  update(time: number, sfx: Sfx, damage: number): boolean {
    if (this.pendingKind !== 'none') {
      const impact = this.pendingImpact;
      const strength = Math.min(1, Math.max(0.15, impact / 30));
      sfx.crash(strength);
      this.scene.cameras.main.shake(150 + strength * 350, 0.004 + strength * 0.016);
      const glass = this.pendingKind === 'front' || this.pendingKind === 'headon';
      if ((glass && impact >= CRACK_IMPACT) || (this.pendingKind === 'side' && damage >= SIDE_CRACK_DAMAGE)) {
        this.crackAt(this.pendingKind === 'side' ? 'side' : 'front', Math.min(1, this.pendingDamage / 40));
      }
      this.pendingKind = 'none';
      this.pendingImpact = 0;
      this.pendingDamage = 0;
    }
    if (damage < LAMP_ON) return false;
    return damage < LAMP_BLINK || time % 800 < 400;
  }

  private crackAt(where: 'front' | 'side', severity: number): void {
    const rng = this.rng;
    const size = 70 + severity * 130;
    // Лобовой удар — по стеклу перед водителем и в центре; боковой — у стоек
    const x = where === 'side' ? (next(rng) < 0.5 ? range(rng, 140, 300) : range(rng, 1000, 1150)) : range(rng, 260, 1000);
    const y = range(rng, 60, DASH_TOP - 40);
    this.cracks.add(x, y, size);
  }
}
