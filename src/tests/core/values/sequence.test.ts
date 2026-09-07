import { describe, expect, it } from 'vitest';

import { fk } from '../../../index';

describe('sequences', () => {
  it('creates immutable uniform and explicit sequences', () => {
    const red = fk.color3FromRGB(255, 0, 0);
    const green = fk.color3FromRGB(0, 255, 0);
    const blue = fk.color3FromRGB(0, 0, 255);
    const colors = fk.colorSequence(red, green, blue);
    const transparency = fk.numberSequence(
      { Time: 0, Value: 0 },
      { Time: 0.25, Value: 0.5 },
      { Time: 1, Value: 1 },
    );

    expect(colors.map((keypoint) => keypoint.Time)).toEqual([0, 0.5, 1]);
    expect(transparency[1]).toEqual({ Time: 0.25, Value: 0.5 });
    expect(Object.isFrozen(colors)).toBe(true);
    expect(Object.isFrozen(colors[0])).toBe(true);
    expect(() => fk.numberSequence({ Time: 0.2, Value: 0 }, { Time: 1, Value: 1 })).toThrow(
      /begin at 0/,
    );
  });
});
