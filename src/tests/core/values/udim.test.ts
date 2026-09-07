import { describe, expect, it } from 'vitest';

import { fk } from '../../../index';

describe('immutable value primitives', () => {
  it('are immutable at runtime', () => {
    const size = fk.udim2FromOffset(10, 20);

    expect(Object.isFrozen(fk.color3FromRGB(1, 2, 3))).toBe(true);
    expect(Object.isFrozen(fk.vector2(1, 2))).toBe(true);
    expect(Object.isFrozen(size)).toBe(true);
    expect(Object.isFrozen(size.X)).toBe(true);
  });
});
