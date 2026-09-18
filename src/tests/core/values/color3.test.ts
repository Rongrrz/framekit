import { describe, expect, it } from 'vitest';

import { fk } from '../../../index.js';

describe('colors', () => {
  it('parses case-insensitive six-digit hexadecimal colors', () => {
    expect(fk.color3FromHex('#0a14ff')).toEqual(fk.color3FromRGB(10, 20, 255));
    expect(fk.color3FromHex('#0A14FF')).toEqual(fk.color3FromRGB(10, 20, 255));
  });

  it('rounds and constrains color components', () => {
    expect(fk.color3FromRGB(-1, 12.6, 300)).toEqual({ R: 0, G: 13, B: 255 });
    expect(Object.isFrozen(fk.color3FromRGB(1, 2, 3))).toBe(true);
  });

  it.each(['0a14ff', '#abc', '#0a14ff00', '#gg0000'])(
    'rejects unsupported hex format %s',
    (hex) => {
      expect(() => fk.color3FromHex(hex)).toThrow(/#RRGGBB/);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite channels (%s)',
    (invalid) => {
      expect(() => fk.color3FromRGB(invalid, 0, 0)).toThrow(/finite/);
      expect(() => fk.color3FromRGB(0, invalid, 0)).toThrow(/finite/);
      expect(() => fk.color3FromRGB(0, 0, invalid)).toThrow(/finite/);
    },
  );
});
