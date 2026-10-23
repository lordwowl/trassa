// Общие типы и перечисления ядра.

export const WEATHERS = ['clear', 'cloudy', 'rain', 'heavy_rain', 'fog', 'snow'] as const;
export type Weather = (typeof WEATHERS)[number];

export const SCENE_KEYS = ['boot', 'menu', 'drive', 'map', 'city'] as const;
export type SceneKey = (typeof SCENE_KEYS)[number];

export function isWeather(v: unknown): v is Weather {
  return typeof v === 'string' && (WEATHERS as readonly string[]).includes(v);
}
