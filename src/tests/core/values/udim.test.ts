import { describe, expect, it } from 'vitest';

import { udim, udim2, udim2FromOffset, udim2FromScale } from '../../../index.js';

describe('UDim values', () => {
  it('creates immutable dimensions and scale/offset conveniences', () => {
    const size = udim2FromOffset(10, 20);

    expect(size).toEqual({ X: { Scale: 0, Offset: 10 }, Y: { Scale: 0, Offset: 20 } });
    expect(udim2FromScale(0.5, 1)).toEqual(udim2(0.5, 0, 1, 0));
    expect(Object.isFrozen(udim(0.5, -10))).toBe(true);
    expect(Object.isFrozen(size)).toBe(true);
    expect(Object.isFrozen(size.X)).toBe(true);
    expect(Object.isFrozen(size.Y)).toBe(true);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite components (%s)',
    (invalid) => {
      expect(() => udim(invalid, 0)).toThrow(/finite/);
      expect(() => udim(0, invalid)).toThrow(/finite/);
      expect(() => udim2FromOffset(0, invalid)).toThrow(/finite/);
      expect(() => udim2FromScale(0, invalid)).toThrow(/finite/);
    },
  );
});
