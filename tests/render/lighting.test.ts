import { describe, expect, it } from 'vitest';
import { beamAt, createLighting, lerpColor, shade, skyColors, updateLighting } from '../../src/render/road/lighting';

const params = { nightAmbient: 0.1, lowRange: 45, highRange: 110, beamIntensity: 0.85 };

describe('освещение', () => {
  it('днём цвета не меняются', () => {
    const l = updateLighting(createLighting(), 12, 0, params);
    expect(shade(0x6a6f74, l, 50)).toBe(0x6a6f74);
  });

  it('ночью без фар темно, с фарами вблизи светлее, вдали — нет', () => {
    const off = updateLighting(createLighting(), 1, 0, params);
    const low = updateLighting(createLighting(), 1, 1, params);
    const dark = shade(0x808080, off, 10);
    const lit = shade(0x808080, low, 10);
    expect(dark & 0xff).toBeLessThan(40);
    expect(lit & 0xff).toBeGreaterThan(90);
    expect(shade(0x808080, low, 200)).toBe(shade(0x808080, off, 200));
  });

  it('дальний свет светит дальше ближнего', () => {
    const low = updateLighting(createLighting(), 1, 1, params);
    const high = updateLighting(createLighting(), 1, 2, params);
    expect(beamAt(low, 60)).toBe(0);
    expect(beamAt(high, 60)).toBeGreaterThan(0.5);
    expect(beamAt(high, 10)).toBeCloseTo(0.85);
    expect(beamAt(updateLighting(createLighting(), 1, 0, params), 10)).toBe(0);
  });

  it('интерполяция цвета и небо', () => {
    expect(lerpColor(0x000000, 0xffffff, 0.5)).toBe(0x7f7f7f);
    expect(lerpColor(0x102030, 0xffffff, 0)).toBe(0x102030);
    const day = skyColors({ top: 0, bottom: 0 }, 12);
    const night = skyColors({ top: 0, bottom: 0 }, 1);
    expect(day.bottom & 0xff).toBeGreaterThan(night.bottom & 0xff);
    const dusk = skyColors({ top: 0, bottom: 0 }, 19.25);
    // на закате горизонт тёплый: красного больше, чем синего
    expect((dusk.bottom >> 16) & 0xff).toBeGreaterThan(dusk.bottom & 0xff);
  });
});
