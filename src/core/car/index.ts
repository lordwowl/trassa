// Модель машины: скорость, обороты, передачи, топливо, повреждения. Реализация — M1–M4.

export interface CarPhysics {
  /** Скорость, м/с. */
  speed: number;
  rpm: number;
  gear: number;
}
