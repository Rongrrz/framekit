import { describe, expect, it } from 'vitest';

import { fk } from '../../../index.js';

describe('Vector2 values', () => {
  it('preserves signed fractional components in an immutable vector', () => {
    const vector = fk.vector2(-1.5, 2.25);
    expect(vector).toEqual({ X: -1.5, Y: 2.25 });
    expect(Object.isFrozen(vector)).toBe(true);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite components (%s)',
    (invalid) => {
      expect(() => fk.vector2(invalid, 0)).toThrow(/Vector2 X.*finite/);
      expect(() => fk.vector2(0, invalid)).toThrow(/Vector2 Y.*finite/);
    },
  );
});
