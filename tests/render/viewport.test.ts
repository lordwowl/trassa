import { describe, expect, it } from 'vitest';
import { isScaleStale } from '../../src/render/viewport';

describe('isScaleStale', () => {
  it('вписанный размер — не устарел', () => {
    expect(isScaleStale(700, 330, 586.7, 330, 1280, 720)).toBe(false);
    expect(isScaleStale(412, 860, 412, 231.75, 1280, 720)).toBe(false);
  });

  it('размер с вертикальной ориентации в горизонтальном окне — устарел', () => {
    expect(isScaleStale(700, 330, 355, 200, 1280, 720)).toBe(true);
  });

  it('скрытый родитель (0×0) не считается ошибкой', () => {
    expect(isScaleStale(0, 0, 355, 200, 1280, 720)).toBe(false);
  });
});
