// Модель машины (аркадная, GDD 5.2). Все величины в метрах и секундах.

export interface CarState {
  /** Позиция вдоль трассы, м (без зацикливания: растёт всегда). */
  z: number;
  /** Смещение от центра дороги, м (вправо > 0). */
  x: number;
  /** Скорость, м/с, ≥ 0. */
  speed: number;
  /** Фактическое положение руля −1..1 (догоняет ввод с конечной скоростью). */
  steer: number;
  /** Колёса за краем полотна. */
  offroad: boolean;
  /** Текущая передача, 1..gearCount. */
  gear: number;
  /** Обороты двигателя, об/мин (для приборов и звука). */
  rpm: number;
  /** Сколько ещё идёт переключение, с (тяги нет). */
  shiftTimer: number;
  /** Накопленное время выше красной зоны, с (износ — M3/M4). */
  overRevTime: number;
}

/** Управление на текущий шаг. */
export interface CarInput {
  /** Газ 0..1. */
  throttle: number;
  /** Тормоз 0..1. */
  brake: number;
  /** Руль −1 (влево) .. 1 (вправо). */
  steer: number;
  /** Механическая КПП (иначе автомат). */
  manual: boolean;
  /** Запрос переключения на механике: +1 вверх, −1 вниз, 0 — нет. Сбрасывается физикой после обработки. */
  shift: number;
}

export interface CarParams {
  /** Макс. скорость, м/с. */
  maxSpeed: number;
  /** Тяга двигателя на высшей передаче в середине оборотов, м/с². */
  accel: number;
  /** Число передач (1..5). */
  gearCount: number;
  /** Скорость на отсечке для каждой передачи — доля maxSpeed (5 значений, используются первые gearCount). */
  gearTops: number[];
  /** Насколько низкие передачи тянут сильнее: тяга ∝ (vmax_последней / vmax_передачи)^gearBoost. */
  gearBoost: number;
  /** Холостые и максимальные обороты, об/мин. */
  idleRpm: number;
  redline: number;
  /** Автомат: вверх при доле оборотов выше, вниз — ниже (0..1). */
  upshiftAt: number;
  downshiftAt: number;
  /** Длительность переключения, с. */
  shiftTime: number;
  /** Замедление на полном тормозе, м/с². */
  braking: number;
  /** Сопротивление воздуха: замедление = drag · v², 1/м. */
  drag: number;
  /** Сопротивление качения, м/с². */
  rolling: number;
  /** Торможение двигателем без газа, м/с². */
  engineBrake: number;
  /** Множитель влияния уклона (1 = g · уклон). */
  gravity: number;
  /** Боковая скорость на полном руле = steerGain · v, 1/с·м/м. */
  steerGain: number;
  /** Скорость, с которой руль догоняет ввод, 1/с. */
  steerResponse: number;
  /** Центробежный снос: боковая скорость = centrifugal · v² · кривизна. */
  centrifugal: number;
  /** Замедление на обочине, м/с². */
  offroadDecel: number;
  /** До какой скорости обочина тормозит машину, м/с. */
  offroadMaxSpeed: number;
  /** Как далеко за край полотна можно уехать, м. */
  offroadLimit: number;
}

/** Дорога в точке машины. */
export interface RoadContext {
  /** Кривизна, 1/м (вправо > 0). */
  curve: number;
  /** Уклон: подъём > 0. */
  grade: number;
  /** Половина ширины полотна, м. */
  halfWidth: number;
  /** Сцепление 0..1 (1 — сухо; мокро/снег — меньше): тормоз слабее, руль мягче, снос сильнее. */
  grip: number;
}

export function createCarState(): CarState {
  return { z: 0, x: 0, speed: 0, steer: 0, offroad: false, gear: 1, rpm: 0, shiftTimer: 0, overRevTime: 0 };
}
