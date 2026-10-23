// Модель дороги: массив сегментов фиксированной длины.

export interface RoadSegment {
  /** Кривизна в начале сегмента, 1/м (радиус поворота = 1/|curve|). Влево < 0 < вправо. */
  curve: number;
  /** Высота начала сегмента, м. Конец сегмента = начало следующего. */
  y: number;
  /** Число полос. */
  lanes: number;
}

export interface Road {
  segments: RoadSegment[];
  /** Длина сегмента, м. */
  segmentLength: number;
  /** Полная длина, м. Трасса замкнута: за последним сегментом идёт первый. */
  length: number;
}
