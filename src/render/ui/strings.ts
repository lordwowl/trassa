// Доступ к строкам интерфейса из data/strings.ru.json.
import strings from '../../data/strings.ru.json';

export type StringKey = keyof typeof strings;

export function t(key: StringKey): string {
  return strings[key];
}

/** Строка с подстановками: «{name}» заменяется значением vars.name. */
export function tf(key: StringKey, vars: Record<string, string | number>): string {
  return strings[key].replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/** Часы → «1 ч 30 мин». */
export function formatHours(h: number): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return hh > 0 ? (mm > 0 ? `${hh} ч ${mm} мин` : `${hh} ч`) : `${mm} мин`;
}
