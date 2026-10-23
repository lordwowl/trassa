// Тюнинг: все настраиваемые числа из data/tuning.json.
// Значения можно переопределить (debug-панель), затем выгрузить обратно в формате tuning.json.

export interface TuningParam {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
}

export interface TuningData {
  version: number;
  params: Record<string, TuningParam>;
}

/** Плоская таблица текущих значений: tuning.values['car.maxSpeed']. */
export interface Tuning {
  readonly data: TuningData;
  readonly values: Record<string, number>;
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Проверка формата tuning.json. Бросает понятную ошибку. */
export function parseTuningData(raw: unknown): TuningData {
  if (typeof raw !== 'object' || raw === null) throw new Error('tuning.json: ожидается объект');
  const r = raw as Record<string, unknown>;
  if (!isNum(r.version)) throw new Error('tuning.json: нет числового поля version');
  if (typeof r.params !== 'object' || r.params === null) throw new Error('tuning.json: нет объекта params');
  const params: Record<string, TuningParam> = {};
  for (const [key, p] of Object.entries(r.params as Record<string, unknown>)) {
    if (typeof p !== 'object' || p === null) throw new Error(`tuning.json: ${key} — ожидается объект`);
    const q = p as Record<string, unknown>;
    for (const f of ['value', 'min', 'max', 'step'] as const) {
      if (!isNum(q[f])) throw new Error(`tuning.json: ${key}.${f} — ожидается число`);
    }
    const t: TuningParam = {
      value: q.value as number,
      min: q.min as number,
      max: q.max as number,
      step: q.step as number,
      label: typeof q.label === 'string' ? q.label : key,
    };
    if (t.min > t.max) throw new Error(`tuning.json: ${key} — min > max`);
    if (t.step <= 0) throw new Error(`tuning.json: ${key} — step должен быть > 0`);
    params[key] = t;
  }
  return { version: r.version, params };
}

export function createTuning(data: TuningData, overrides: Record<string, number> = {}): Tuning {
  const values: Record<string, number> = {};
  for (const [key, p] of Object.entries(data.params)) values[key] = p.value;
  const t = { data, values };
  for (const [key, v] of Object.entries(overrides)) setTuningValue(t, key, v);
  return t;
}

/** Установить значение с ограничением min/max. Неизвестные ключи и не-числа игнорируются. */
export function setTuningValue(t: Tuning, key: string, v: number): boolean {
  const p = t.data.params[key];
  if (!p || !isNum(v)) return false;
  t.values[key] = Math.min(p.max, Math.max(p.min, v));
  return true;
}

export function getTuning(t: Tuning, key: string): number {
  const v = t.values[key];
  if (v === undefined) throw new Error(`tuning: неизвестный параметр ${key}`);
  return v;
}

/** Ключи, значения которых отличаются от исходных. */
export function tuningOverrides(t: Tuning): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, p] of Object.entries(t.data.params)) {
    const v = t.values[key];
    if (v !== undefined && v !== p.value) out[key] = v;
  }
  return out;
}

/** Полный tuning.json с текущими значениями — для кнопки «Скопировать JSON». */
export function exportTuningJson(t: Tuning): string {
  const params: Record<string, TuningParam> = {};
  for (const [key, p] of Object.entries(t.data.params)) params[key] = { ...p, value: t.values[key] ?? p.value };
  return JSON.stringify({ version: t.data.version, params }, null, 2);
}

/** Разбор сохранённых переопределений (из localStorage). Мусор отбрасывается. */
export function parseOverrides(raw: string | null): Record<string, number> {
  if (!raw) return {};
  try {
    const obj: unknown = JSON.parse(raw);
    if (typeof obj !== 'object' || obj === null) return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) if (isNum(v)) out[k] = v;
    return out;
  } catch {
    return {};
  }
}
