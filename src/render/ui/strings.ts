// Доступ к строкам интерфейса из data/strings.ru.json.
import strings from '../../data/strings.ru.json';

export type StringKey = keyof typeof strings;

export function t(key: StringKey): string {
  return strings[key];
}
