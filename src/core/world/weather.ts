// Погода (GDD 5.9): что каждая погода делает с видимостью, светом, дождём на стекле и сцеплением.

import type { Weather } from '../types';

export interface WeatherParams {
  /** Видимость, м: в дождь, ливень, туман, снег. */
  rainVisibility: number;
  heavyVisibility: number;
  fogVisibility: number;
  snowVisibility: number;
  /** Сцепление на мокрой и заснеженной дороге (1 — сухо). */
  wetGrip: number;
  snowGrip: number;
}

export interface WeatherEffects {
  /** Интенсивность дождя 0..1 (капли на стекле, струи). */
  rain: number;
  /** Видимость, м (Infinity — ясно). */
  visibility: number;
  /** Пасмурность 0..1: тусклее свет, серее небо. */
  overcast: number;
  /** Множитель сцепления 0..1. */
  grip: number;
}

export function createWeatherEffects(): WeatherEffects {
  return { rain: 0, visibility: Infinity, overcast: 0, grip: 1 };
}

/** Заполняет эффекты погоды (без аллокаций). */
export function weatherEffects(out: WeatherEffects, w: Weather, p: WeatherParams): WeatherEffects {
  out.rain = 0;
  out.visibility = Infinity;
  out.overcast = 0;
  out.grip = 1;
  switch (w) {
    case 'cloudy':
      out.overcast = 0.4;
      break;
    case 'rain':
      out.rain = 0.45;
      out.visibility = p.rainVisibility;
      out.overcast = 0.6;
      out.grip = p.wetGrip;
      break;
    case 'heavy_rain':
      out.rain = 1;
      out.visibility = p.heavyVisibility;
      out.overcast = 0.85;
      out.grip = p.wetGrip;
      break;
    case 'fog':
      out.visibility = p.fogVisibility;
      out.overcast = 0.5;
      // Туман оседает — дорога слегка влажная
      out.grip = 1 - (1 - p.wetGrip) * 0.4;
      break;
    case 'snow':
      out.visibility = p.snowVisibility;
      out.overcast = 0.6;
      out.grip = p.snowGrip;
      break;
    case 'clear':
      break;
  }
  return out;
}

/** Доля «растворения» в дымке на расстоянии z, 0..1 (экспоненциальный туман). */
export function fogAmount(z: number, visibility: number): number {
  if (!(visibility < Infinity) || z <= 0) return 0;
  // На расстоянии видимости объект почти растворён (95%)
  return 1 - Math.exp((-3 * z) / visibility);
}
