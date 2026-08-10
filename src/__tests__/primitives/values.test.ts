import { describe, expect, it } from 'vitest';

import { color3, color3FromHex, color3ToCss } from '../../primitives/color3';
import { udim2FromOffset } from '../../primitives/udim2';
import { vector2 } from '../../primitives/vector2';

describe('value primitives', () => {
  it('are immutable at runtime', () => {
    const size = udim2FromOffset(10, 20);
    expect(Object.isFrozen(color3(1, 2, 3))).toBe(true);
    expect(Object.isFrozen(vector2(1, 2))).toBe(true);
    expect(Object.isFrozen(size)).toBe(true);
    expect(Object.isFrozen(size.X)).toBe(true);
  });

  it('parses and validates hexadecimal colors', () => {
    expect(color3FromHex('#0a14ff')).toEqual(color3(10, 20, 255));
    expect(() => color3FromHex('0a14ff')).toThrow(/#RRGGBB/);
    expect(color3ToCss(color3(10, 20, 30), 0.25)).toBe('rgb(10 20 30 / 0.75)');
  });
});
