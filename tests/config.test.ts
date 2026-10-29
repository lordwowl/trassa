import { describe, expect, it } from 'vitest';
import { parseLaunchConfig } from '../src/config';

describe('parseLaunchConfig', () => {
  it('значения по умолчанию', () => {
    const c = parseLaunchConfig('');
    expect(c).toMatchObject({ debug: false, scene: 'menu', seed: null, weather: null, time: null, car: null, money: null, fuel: null, damage: null });
    expect(c.warnings).toEqual([]);
  });

  it('разбирает все параметры', () => {
    const c = parseLaunchConfig('?debug=1&scene=drive&seed=123&weather=rain&time=22&car=oldtimer&money=500&fuel=12.5&damage=45');
    expect(c).toMatchObject({ debug: true, scene: 'drive', seed: 123, weather: 'rain', time: 22, car: 'oldtimer', money: 500, fuel: 12.5, damage: 45 });
    expect(c.warnings).toEqual([]);
  });

  it('debug=0 выключает debug', () => {
    expect(parseLaunchConfig('?debug=0').debug).toBe(false);
    expect(parseLaunchConfig('?debug').debug).toBe(true);
  });

  it('неверные значения игнорируются с предупреждением', () => {
    const c = parseLaunchConfig('?scene=moon&seed=abc&weather=lava&time=25&fuel=-1&damage=120');
    expect(c.scene).toBe('menu');
    expect(c.seed).toBeNull();
    expect(c.weather).toBeNull();
    expect(c.time).toBeNull();
    expect(c.fuel).toBeNull();
    expect(c.damage).toBeNull();
    expect(c.warnings).toHaveLength(6);
  });

  it('деньги округляются до целого', () => {
    expect(parseLaunchConfig('?money=10.7').money).toBe(11);
  });
});
