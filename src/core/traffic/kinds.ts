// Виды машин трафика из data/traffic.json (размеры, м; скорости, м/с; доля в потоке).

export interface TrafficKind {
  id: string;
  length: number;
  width: number;
  height: number;
  speedMin: number;
  speedMax: number;
  weight: number;
}

function num(o: Record<string, unknown>, f: string, where: string): number {
  const v = o[f];
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new Error(`traffic.json: ${where}.${f} — ожидается число ≥ 0`);
  return v;
}

/** Проверка формата traffic.json. Бросает понятную ошибку. */
export function parseTrafficKinds(raw: unknown): TrafficKind[] {
  const r = raw as { kinds?: unknown } | null;
  if (typeof r !== 'object' || r === null || !Array.isArray(r.kinds) || r.kinds.length === 0) {
    throw new Error('traffic.json: нужен непустой массив kinds');
  }
  return r.kinds.map((k: unknown, i: number) => {
    if (typeof k !== 'object' || k === null) throw new Error(`traffic.json: kinds[${i}] — ожидается объект`);
    const o = k as Record<string, unknown>;
    if (typeof o.id !== 'string' || o.id === '') throw new Error(`traffic.json: kinds[${i}].id — ожидается строка`);
    const where = `kinds[${i}] (${o.id})`;
    const kind: TrafficKind = {
      id: o.id,
      length: num(o, 'length', where),
      width: num(o, 'width', where),
      height: num(o, 'height', where),
      speedMin: num(o, 'speedMin', where),
      speedMax: num(o, 'speedMax', where),
      weight: num(o, 'weight', where),
    };
    if (kind.speedMin > kind.speedMax) throw new Error(`traffic.json: ${where} — speedMin > speedMax`);
    return kind;
  });
}
