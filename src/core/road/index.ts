// Модель дороги: сегменты, кривизна, высота, полосы, генератор трассы. Реализация — M1.

export interface RoadSegment {
  index: number;
  /** Кривизна поворота (влево < 0 < вправо). */
  curve: number;
  /** Высота точки сегмента, м. */
  y: number;
  lanes: number;
}
