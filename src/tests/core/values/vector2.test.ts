import { describe, expect, it } from 'vitest';

import { vector2 } from '../../../index.js';

describe('Vector2 values', () => {
  it('preserves signed fractional components in an immutable vector', () => {
    const vector = vector2(-1.5, 2.25);
    expect(vector).toEqual({ X: -1.5, Y: 2.25 });
    expect(Object.isFrozen(vector)).toBe(true);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite components (%s)',
    (invalid) => {
      expect(() => vector2(invalid, 0)).toThrow(/Vector2 X.*finite/);
      expect(() => vector2(0, invalid)).toThrow(/Vector2 Y.*finite/);
    },
  );
});
