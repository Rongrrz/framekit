import { describe, expect, it } from 'vitest';

import { fk } from '../../../index.js';

describe('UDim values', () => {
  it('creates immutable dimensions and scale/offset conveniences', () => {
    const size = fk.udim2FromOffset(10, 20);

    expect(size).toEqual({ X: { Scale: 0, Offset: 10 }, Y: { Scale: 0, Offset: 20 } });
    expect(fk.udim2FromScale(0.5, 1)).toEqual(fk.udim2(0.5, 0, 1, 0));
    expect(Object.isFrozen(fk.udim(0.5, -10))).toBe(true);
    expect(Object.isFrozen(size)).toBe(true);
    expect(Object.isFrozen(size.X)).toBe(true);
    expect(Object.isFrozen(size.Y)).toBe(true);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite components (%s)',
    (invalid) => {
      expect(() => fk.udim(invalid, 0)).toThrow(/finite/);
      expect(() => fk.udim(0, invalid)).toThrow(/finite/);
      expect(() => fk.udim2FromOffset(0, invalid)).toThrow(/finite/);
      expect(() => fk.udim2FromScale(0, invalid)).toThrow(/finite/);
    },
  );
});
