// Авария и эвакуатор в сцене езды (GDD 5.5). Сильное лобовое — окно «Авария»: время и деньги, рейс продолжается.
// 100% повреждений и машина встала — окно «Машина разбита»: эвакуатор с аварийным ремонтом или рейс заново
// (с состояния на начало рейса). Пока окно открыто, симуляция стоит.
import type Phaser from 'phaser';
import type { CarState } from '../../core/car';
import { applyOutcome, crashOutcome, isSevereCrash, towOutcome, type AccidentOutcome, type AccidentParams } from '../../core/economy';
import { deserialize, serialize } from '../../core/save/save';
import type { GameState } from '../../core/state';
import { clearTrafficNear, type CollisionResult, type TrafficState } from '../../core/traffic';
import { getTuning, type Tuning } from '../../core/tuning';
import { AccidentOverlay } from '../ui/AccidentOverlay';
import { formatHours, t, tf } from '../ui/strings';

/** После аварии убрать машины ближе этого, м. */
const CLEAR_RADIUS = 200;
/** Машина считается вставшей ниже этой скорости, м/с. */
const STOPPED = 0.5;

export class DriveAccident {
  private readonly overlay: AccidentOverlay;
  /** Состояние на начало рейса — для «Рейс заново». */
  private readonly snapshot: string;
  private pendingImpact = -1;
  readonly params: AccidentParams = {
    headonImpact: 18, costBase: 150, costPerImpact: 10, timeLoss: 1.5,
    towBase: 300, towPerKm: 15, towDistance: 25, towSpeed: 40, towRepairTo: 60,
  };

  constructor(scene: Phaser.Scene, private readonly state: GameState, private readonly onRestart: () => void) {
    this.overlay = new AccidentOverlay(scene);
    this.snapshot = serialize(state);
  }

  get paused(): boolean {
    return this.overlay.open;
  }

  readParams(tn: Tuning): void {
    const p = this.params;
    p.headonImpact = getTuning(tn, 'accident.headonImpact');
    p.costBase = getTuning(tn, 'accident.costBase');
    p.costPerImpact = getTuning(tn, 'accident.costPerImpact');
    p.timeLoss = getTuning(tn, 'accident.timeLoss');
    p.towBase = getTuning(tn, 'accident.towBase');
    p.towPerKm = getTuning(tn, 'accident.towPerKm');
    p.towDistance = getTuning(tn, 'accident.towDistance');
    p.towSpeed = getTuning(tn, 'accident.towSpeed');
    p.towRepairTo = getTuning(tn, 'accident.towRepairTo');
  }

  /** Из шага физики: запомнить сильное лобовое. */
  hit(r: CollisionResult): void {
    if (isSevereCrash(r.kind, r.impact, this.params) && r.impact > this.pendingImpact) this.pendingImpact = r.impact;
  }

  /** Раз в кадр: открыть окно, если пора. */
  update(car: CarState, traffic: TrafficState, laneWidth: number): void {
    if (this.overlay.open) return;
    if (car.damage >= 100 && car.speed < STOPPED) {
      this.pendingImpact = -1;
      this.showTow(car, traffic, laneWidth);
    } else if (this.pendingImpact >= 0) {
      const impact = this.pendingImpact;
      this.pendingImpact = -1;
      // Разбита полностью — сразу эвакуатор
      if (car.damage >= 100) this.showTow(car, traffic, laneWidth);
      else this.showCrash(impact, car, traffic, laneWidth);
    }
  }

  private showCrash(impact: number, car: CarState, traffic: TrafficState, laneWidth: number): void {
    const o = crashOutcome(impact, car.damage, this.params);
    const text = tf('accidentText', {
      speed: Math.round(impact * 3.6), cost: o.cost, time: formatHours(o.hours), damage: Math.round(car.damage),
    }) + '\n' + this.moneyLine(o);
    this.overlay.show(t('accidentTitle'), text, [
      { label: t('accidentContinue'), onClick: () => this.resolve(o, car, traffic, laneWidth) },
    ]);
  }

  private showTow(car: CarState, traffic: TrafficState, laneWidth: number): void {
    const o = towOutcome(this.params);
    const text = tf('towText', {
      km: Math.round(this.params.towDistance), repair: Math.round(o.damageAfter), cost: o.cost, time: formatHours(o.hours),
    }) + '\n' + this.moneyLine(o);
    this.overlay.show(t('towTitle'), text, [
      { label: t('towAccept'), onClick: () => this.resolve(o, car, traffic, laneWidth) },
      { label: t('restartTrip'), onClick: () => this.restart() },
    ]);
  }

  private moneyLine(o: AccidentOutcome): string {
    const money = this.state.money;
    return money >= o.cost ? tf('moneyLeft', { money: money - o.cost }) : tf('moneyShort', { money });
  }

  /** Заплатить, потерять время, продолжить с места с чистой дороги в своей полосе. */
  private resolve(o: AccidentOutcome, car: CarState, traffic: TrafficState, laneWidth: number): void {
    applyOutcome(this.state, o);
    car.damage = this.state.damage;
    car.speed = 0;
    car.steer = 0;
    car.x = laneWidth / 2;
    clearTrafficNear(traffic, car.z, CLEAR_RADIUS);
    this.overlay.hide();
  }

  /** Вернуть состояние на начало рейса и перезапустить сцену. */
  private restart(): void {
    const s = deserialize(this.snapshot);
    if (s) Object.assign(this.state, s);
    this.overlay.hide();
    this.onRestart();
  }
}
