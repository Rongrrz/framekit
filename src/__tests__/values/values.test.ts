import { describe, expect, it } from 'vitest';

import { fk } from '../..';

const { color3FromHex, color3FromRGB, udim2FromOffset, vector2 } = fk;

describe('value primitives', () => {
  it('are immutable at runtime', () => {
    const size = udim2FromOffset(10, 20);
    expect(Object.isFrozen(color3FromRGB(1, 2, 3))).toBe(true);
    expect(Object.isFrozen(vector2(1, 2))).toBe(true);
    expect(Object.isFrozen(size)).toBe(true);
    expect(Object.isFrozen(size.X)).toBe(true);
  });

  it('parses and validates hexadecimal colors', () => {
    expect(color3FromHex('#0a14ff')).toEqual(color3FromRGB(10, 20, 255));
    expect(() => color3FromHex('0a14ff')).toThrow(/#RRGGBB/);
  });

  it('rounds and constrains color components', () => {
    expect(color3FromRGB(-1, 12.6, 300)).toEqual({ R: 0, G: 13, B: 255 });
    expect(() => color3FromRGB(Number.NaN, 0, 0)).toThrow(/finite/);
  });
});
