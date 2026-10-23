// Перспективная проекция точки мира в экран. Без аллокаций: результат пишется в out.

export interface Projected {
  x: number;
  y: number;
  /** Пикселей на метр на данной глубине. */
  scale: number;
}

export interface ProjectionView {
  /** Фокусное расстояние, px. */
  focal: number;
  /** Центр экрана по X и линия горизонта, px. */
  centerX: number;
  horizonY: number;
}

/** Фокусное расстояние по горизонтальному углу обзора (градусы) и ширине экрана. */
export function focalFromFov(fovDeg: number, screenWidth: number): number {
  return screenWidth / 2 / Math.tan((fovDeg * Math.PI) / 360);
}

/**
 * dx, dy — смещение точки относительно камеры (м), dz — глубина (м, > 0).
 * Экранная Y растёт вниз.
 */
export function project(out: Projected, view: ProjectionView, dx: number, dy: number, dz: number): Projected {
  const scale = view.focal / dz;
  out.scale = scale;
  out.x = view.centerX + dx * scale;
  out.y = view.horizonY - dy * scale;
  return out;
}
