// Модель дороги: массив сегментов фиксированной длины.

export interface RoadSegment {
  /** Кривизна в начале сегмента, 1/м (радиус поворота = 1/|curve|). Влево < 0 < вправо. */
  curve: number;
  /** Высота начала сегмента, м. Конец сегмента = начало следующего. */
  y: number;
  /** Число полос. */
  lanes: number;
  /** Придорожные объекты на этом сегменте (нет — пусто). */
  objects?: RoadObject[];
}

export const ROAD_OBJECT_KINDS = ['tree', 'tree_round', 'pole', 'sign'] as const;
export type RoadObjectKind = (typeof ROAD_OBJECT_KINDS)[number];

/** Придорожный объект: стоит у начала сегмента. */
export interface RoadObject {
  kind: RoadObjectKind;
  /** Смещение от центра дороги, м (вправо > 0). */
  x: number;
  /** Множитель размера относительно базовой высоты вида. */
  scale: number;
}

export interface Road {
  segments: RoadSegment[];
  /** Длина сегмента, м. */
  segmentLength: number;
  /** Полная длина, м. Трасса замкнута: за последним сегментом идёт первый. */
  length: number;
}
