import { color3FromHex, color3FromRGB } from 'framekit';
import { describe, expect, it } from 'vitest';

describe('colors', () => {
  it('parses case-insensitive six-digit hexadecimal colors', () => {
    expect(color3FromHex('#0a14ff')).toEqual(color3FromRGB(10, 20, 255));
    expect(color3FromHex('#0A14FF')).toEqual(color3FromRGB(10, 20, 255));
  });

  it('rounds and constrains color components', () => {
    expect(color3FromRGB(-1, 12.6, 300)).toEqual({ R: 0, G: 13, B: 255 });
    expect(Object.isFrozen(color3FromRGB(1, 2, 3))).toBe(true);
  });

  it.each(['0a14ff', '#abc', '#0a14ff00', '#gg0000'])(
    'rejects unsupported hex format %s',
    (hex) => {
      expect(() => color3FromHex(hex)).toThrow(/#RRGGBB/);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite channels (%s)',
    (invalid) => {
      expect(() => color3FromRGB(invalid, 0, 0)).toThrow(/finite/);
      expect(() => color3FromRGB(0, invalid, 0)).toThrow(/finite/);
      expect(() => color3FromRGB(0, 0, invalid)).toThrow(/finite/);
    },
  );
});
