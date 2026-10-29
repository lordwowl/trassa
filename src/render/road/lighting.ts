// Освещение сцены: общий свет по времени суток с оттенком и фары, зависящие от расстояния.
// Чистые функции без Phaser (покрыты тестами); в кадре без аллокаций — пишут в переданный объект.
import { daylight, fogAmount, twilight, type WeatherEffects } from '../../core/world';

export type Headlights = 0 | 1 | 2; // выкл, ближний, дальний

export interface LightingParams {
  /** Освещённость безлунной ночью без фар, 0..1. */
  nightAmbient: number;
  lowRange: number;
  highRange: number;
  beamIntensity: number;
  /** Полуширина полосы полного света фар, м (от оси машины). */
  beamWidth: number;
  /** Ширина мягкого края луча, м: дальше — темнота. */
  beamFade: number;
}

export interface Lighting {
  ambient: number;
  tintR: number;
  tintG: number;
  tintB: number;
  /** Дальность фар, м (0 — фары выключены). */
  beamRange: number;
  beamIntensity: number;
  beamWidth: number;
  beamFade: number;
  /** Видимость, м (Infinity — без дымки) и цвет дымки. */
  visibility: number;
  fogColor: number;
}

export function createLighting(): Lighting {
  return { ambient: 1, tintR: 1, tintG: 1, tintB: 1, beamRange: 0, beamIntensity: 0, beamWidth: 4, beamFade: 3, visibility: Infinity, fogColor: 0xb8c0c8 };
}

/** Оттенки: ночь синеватая, рассвет/закат тёплый. */
const NIGHT_TINT = [0.7, 0.8, 1.1] as const;
const WARM_TINT = [1.05, 0.78, 0.58] as const;

/** Цвет дымки днём и ночью. */
const FOG_DAY = 0xb8c0c8;
const FOG_NIGHT = 0x10141c;

export function updateLighting(out: Lighting, hour: number, lights: Headlights, p: LightingParams, weather?: WeatherEffects): Lighting {
  const d = daylight(hour);
  const overcast = weather ? weather.overcast : 0;
  // В пасмурную погоду закат почти не виден, а свет тусклее
  const w = twilight(hour) * 0.7 * (1 - overcast * 0.8);
  out.ambient = (p.nightAmbient + (1 - p.nightAmbient) * d) * (1 - overcast * 0.35);
  out.visibility = weather ? weather.visibility : Infinity;
  out.fogColor = lerpColor(FOG_NIGHT, FOG_DAY, d * (1 - overcast * 0.25));
  const r = NIGHT_TINT[0] + (1 - NIGHT_TINT[0]) * d;
  const g = NIGHT_TINT[1] + (1 - NIGHT_TINT[1]) * d;
  const b = NIGHT_TINT[2] + (1 - NIGHT_TINT[2]) * d;
  out.tintR = r + (WARM_TINT[0] - r) * w;
  out.tintG = g + (WARM_TINT[1] - g) * w;
  out.tintB = b + (WARM_TINT[2] - b) * w;
  out.beamRange = lights === 2 ? p.highRange : lights === 1 ? p.lowRange : 0;
  out.beamIntensity = p.beamIntensity;
  // Дальний свет чуть шире ближнего
  out.beamWidth = lights === 2 ? p.beamWidth * 1.2 : p.beamWidth;
  out.beamFade = p.beamFade;
  return out;
}

/**
 * Свет фар в точке на расстоянии z и сбоку от оси машины на lateral (м), 0..1.
 * По дальности: полный до половины дальности, дальше спад. Вбок: полный в полосе beamWidth,
 * затем мягкий спад на beamFade — дальше темнота.
 */
export function beamAt(l: Lighting, z: number, lateral = 0): number {
  if (l.beamRange <= 0 || z < 0) return 0;
  const k = (l.beamRange - z) / (l.beamRange * 0.5);
  if (k <= 0) return 0;
  const side = lateral < 0 ? -lateral : lateral;
  let s = 1;
  if (side > l.beamWidth) s = l.beamFade > 0 ? 1 - (side - l.beamWidth) / l.beamFade : 0;
  if (s <= 0) return 0;
  return l.beamIntensity * (k >= 1 ? 1 : k) * s;
}

function channel(c: number, amb: number, tint: number, beam: number): number {
  // Фары добавляют свет там, где темно; белый свет не тонируется
  const f = amb * tint + beam * (1 - amb);
  const v = c * f;
  return v > 255 ? 255 : v < 0 ? 0 : v | 0;
}

/** Цвет 0xRRGGBB при освещении на расстоянии z и смещении lateral от оси машины, с дымкой. */
export function shade(color: number, l: Lighting, z: number, lateral = 0): number {
  const lit = shadeNoFog(color, l, z, lateral);
  const f = fogAmount(z, l.visibility);
  return f > 0 ? lerpColor(lit, l.fogColor, f) : lit;
}

/** Освещение без дымки — для тонировки спрайтов (дымку им даёт прозрачность). */
export function shadeNoFog(color: number, l: Lighting, z: number, lateral = 0): number {
  const beam = beamAt(l, z, lateral);
  const r = channel((color >> 16) & 0xff, l.ambient, l.tintR, beam);
  const g = channel((color >> 8) & 0xff, l.ambient, l.tintG, beam);
  const b = channel(color & 0xff, l.ambient, l.tintB, beam);
  return (r << 16) | (g << 8) | b;
}

/** Включённые фонари у машин трафика, 0..1: в сумерках и ночью, а также в тумане и ливне. */
export function vehicleLightsOn(l: Lighting): number {
  const dark = (0.8 - l.ambient) / 0.35;
  const haze = l.visibility < Infinity ? (400 - l.visibility) / 250 : 0;
  const k = dark > haze ? dark : haze;
  return k <= 0 ? 0 : k >= 1 ? 1 : k;
}

export function lerpColor(a: number, b: number, t: number): number {
  const k = t <= 0 ? 0 : t >= 1 ? 1 : t;
  const r = ((a >> 16) & 0xff) + ((((b >> 16) & 0xff) - ((a >> 16) & 0xff)) * k);
  const g = ((a >> 8) & 0xff) + ((((b >> 8) & 0xff) - ((a >> 8) & 0xff)) * k);
  const bl = (a & 0xff) + (((b & 0xff) - (a & 0xff)) * k);
  return ((r | 0) << 16) | ((g | 0) << 8) | (bl | 0);
}

export interface SkyColors {
  top: number;
  bottom: number;
}

const SKY_DAY = { top: 0x3d8fdc, bottom: 0xa6d8f7 };
const SKY_NIGHT = { top: 0x03060f, bottom: 0x111b33 };
const SKY_WARM = { top: 0x2c3a72, bottom: 0xf0955a };

const SKY_GREY = { top: 0x6f7a86, bottom: 0xa9b1ba };

/** Цвета неба (верх и горизонт) по времени суток, пасмурности и дымке. */
export function skyColors(out: SkyColors, hour: number, l?: Lighting, overcast = 0): SkyColors {
  const d = daylight(hour);
  const w = twilight(hour) * (1 - overcast * 0.8);
  let top = lerpColor(lerpColor(SKY_NIGHT.top, SKY_DAY.top, d), SKY_WARM.top, w * 0.8);
  let bottom = lerpColor(lerpColor(SKY_NIGHT.bottom, SKY_DAY.bottom, d), SKY_WARM.bottom, w * 0.9);
  if (overcast > 0) {
    // Серое небо: днём светло-серое, ночью почти чёрное
    top = lerpColor(top, lerpColor(SKY_NIGHT.top, SKY_GREY.top, d), overcast);
    bottom = lerpColor(bottom, lerpColor(SKY_NIGHT.bottom, SKY_GREY.bottom, d), overcast);
  }
  if (l && l.visibility < Infinity) {
    // В тумане горизонт сливается с дымкой
    const k = Math.min(1, 150 / l.visibility);
    bottom = lerpColor(bottom, l.fogColor, k);
    top = lerpColor(top, l.fogColor, k * 0.6);
  }
  out.top = top;
  out.bottom = bottom;
  return out;
}
