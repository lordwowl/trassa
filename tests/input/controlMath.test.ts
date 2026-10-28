import { describe, expect, it } from 'vitest';
import { inRect, pedalValue, rollFromGravity, smooth, tiltToSteer } from '../../src/input/controlMath';

const pedal = { x: 100, y: 300, w: 150, h: 400 };

describe('педали', () => {
  it('inRect с запасом', () => {
    expect(inRect(pedal, 150, 500)).toBe(true);
    expect(inRect(pedal, 95, 500)).toBe(false);
    expect(inRect(pedal, 95, 500, 10)).toBe(true);
  });

  it('сила по высоте: внизу минимум, вверху 1, посередине между', () => {
    expect(pedalValue(pedal, 700, 0.25)).toBeCloseTo(0.25);
    expect(pedalValue(pedal, 300, 0.25)).toBeCloseTo(1);
    expect(pedalValue(pedal, 500, 0.25)).toBeCloseTo(0.625);
    expect(pedalValue(pedal, 100, 0.25)).toBe(1);
    expect(pedalValue(pedal, 900, 0.25)).toBeCloseTo(0.25);
  });
});

describe('наклон', () => {
  const G = 9.81;
  const rad = (d: number) => (d * Math.PI) / 180;

  it('портрет вертикально — 0°, наклон по часовой — плюс', () => {
    expect(rollFromGravity(0, G, 0)).toBeCloseTo(0);
    // Телефон повёрнут по часовой на 20°: «верх» мира в осях устройства уходит к −x
    expect(rollFromGravity(-G * Math.sin(rad(20)), G * Math.cos(rad(20)), 0)).toBeCloseTo(20);
  });

  it('альбомная ориентация 90°: ровно — 0°, поворот по часовой — плюс', () => {
    // Устройство повёрнуто против часовой: верх мира вдоль +x устройства
    expect(rollFromGravity(G, 0, 90)).toBeCloseTo(0);
    // Ещё поворот телефона по часовой на 15°
    expect(rollFromGravity(G * Math.cos(rad(15)), G * Math.sin(rad(15)), 90)).toBeCloseTo(15);
  });

  it('альбомная 270°: знак согласован', () => {
    expect(rollFromGravity(-G, 0, 270)).toBeCloseTo(0);
    expect(rollFromGravity(-G * Math.cos(rad(15)), -G * Math.sin(rad(15)), 270)).toBeCloseTo(15);
  });

  it('телефон плашмя — угол не определён', () => {
    expect(rollFromGravity(0.3, 0.2, 90)).toBeNull();
  });

  it('руль: мёртвая зона, пропорционально, ограничение, калибровка', () => {
    expect(tiltToSteer(1.5, 0, 25, 2)).toBe(0);
    expect(tiltToSteer(13.5, 0, 25, 2)).toBeCloseTo(0.5);
    expect(tiltToSteer(-40, 0, 25, 2)).toBe(-1);
    expect(tiltToSteer(15, 10, 25, 0)).toBeCloseTo(0.2);
    // калибровка около ±180 не ломает знак
    expect(tiltToSteer(-175, 175, 25, 0)).toBeCloseTo(0.4);
  });

  it('сглаживание сходится к цели и не перескакивает', () => {
    let v = 0;
    for (let i = 0; i < 60; i++) v = smooth(v, 1, 1 / 60, 0.1);
    expect(v).toBeGreaterThan(0.99);
    expect(v).toBeLessThanOrEqual(1);
    expect(smooth(0, 1, 1 / 60, 0)).toBe(1);
  });
});
