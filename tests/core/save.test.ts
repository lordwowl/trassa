import { describe, expect, it } from 'vitest';
import { createGameState } from '../../src/core/state';
import { deserialize, loadGame, saveGame, serialize, type KeyValueStorage } from '../../src/core/save/save';

function memoryStorage(): KeyValueStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

describe('save', () => {
  it('createGameState применяет стартовые условия', () => {
    const s = createGameState({ seed: 5, money: 10.4, fuel: 3, weather: 'rain', timeOfDay: 22, carId: 'x' });
    expect(s).toMatchObject({ seed: 5, money: 10, fuel: 3, weather: 'rain', timeOfDay: 22, carId: 'x', version: 1 });
  });

  it('сохранение и загрузка дают тот же объект', () => {
    const st = memoryStorage();
    const s = createGameState({ seed: 77 });
    expect(saveGame(st, s)).toBe(true);
    expect(loadGame(st)).toEqual(s);
  });

  it('битые данные не роняют загрузку', () => {
    expect(deserialize('{nope')).toBeNull();
    expect(deserialize('{"version":1}')).toBeNull();
    expect(deserialize(serialize({ ...createGameState({ seed: 1 }), version: 999 }))).toBeNull();
  });

  it('сбой хранилища перехватывается', () => {
    const broken: KeyValueStorage = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('quota'); },
      removeItem: () => {},
    };
    expect(saveGame(broken, createGameState({ seed: 1 }))).toBe(false);
    expect(loadGame(broken)).toBeNull();
  });
});
