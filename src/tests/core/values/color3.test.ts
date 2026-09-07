import { describe, expect, it } from 'vitest';

import { fk } from '../../../index';

describe('colors', () => {
  it('parses and validates hexadecimal colors', () => {
    expect(fk.color3FromHex('#0a14ff')).toEqual(fk.color3FromRGB(10, 20, 255));
    expect(() => fk.color3FromHex('0a14ff')).toThrow(/#RRGGBB/);
  });

  it('rounds and constrains color components', () => {
    expect(fk.color3FromRGB(-1, 12.6, 300)).toEqual({ R: 0, G: 13, B: 255 });
    expect(() => fk.color3FromRGB(Number.NaN, 0, 0)).toThrow(/finite/);
  });
});
