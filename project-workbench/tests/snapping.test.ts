import { describe, expect, it } from 'vitest';

import { snapTranslation } from '../src/snapping';

const rect = { x: 10, y: 10, width: 100, height: 50 };
const target = { x: 200, y: 100, width: 100, height: 50 };

describe('canvas snapping', () => {
  it('aligns nearby edges and centers and reports the matching guides', () => {
    const moved = snapTranslation(rect, { x: 88, y: 39 }, [target], true, true);
    expect(moved).toEqual({ x: 90, y: 40, vertical: 200, horizontal: 100 });
  });

  it('uses an eight-pixel grid away from alignment targets', () => {
    expect(snapTranslation(rect, { x: 23, y: 25 }, [], true, true)).toEqual({ x: 22, y: 22 });
  });

  it('allows both free movement and hidden guides independently', () => {
    expect(snapTranslation(rect, { x: 88, y: 39 }, [target], false, false)).toEqual({
      x: 88,
      y: 39,
    });
    expect(snapTranslation(rect, { x: 88, y: 39 }, [target], true, false)).toEqual({
      x: 90,
      y: 40,
    });
    expect(snapTranslation(rect, { x: 90, y: 40 }, [target], false, true)).toEqual({
      x: 90,
      y: 40,
      vertical: 200,
      horizontal: 100,
    });
  });
});
