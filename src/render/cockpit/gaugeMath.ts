// Математика стрелочных приборов (без Phaser — покрыта тестами).

/** Угол стрелки, радианы: value от 0 до max раскладывается между start и end (градусы, по часовой от «вправо»). */
export function needleAngle(value: number, max: number, startDeg: number, endDeg: number): number {
  const k = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return ((startDeg + (endDeg - startDeg) * k) * Math.PI) / 180;
}

/** Значения делений шкалы: 0, step, 2·step … ≤ max. */
export function gaugeTicks(max: number, step: number): number[] {
  const out: number[] = [];
  if (step <= 0) return out;
  for (let v = 0; v <= max + 1e-9; v += step) out.push(Math.round(v));
  return out;
}
