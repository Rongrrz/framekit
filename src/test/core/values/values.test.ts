import { describe, expect, it } from 'vitest';

import { fk } from '../../..';

const { color3FromHex, color3FromRGB, colorSequence, numberSequence, udim2FromOffset, vector2 } =
  fk;

describe('value primitives', () => {
  it('are immutable at runtime', () => {
    const size = udim2FromOffset(10, 20);

    expect(Object.isFrozen(color3FromRGB(1, 2, 3))).toBe(true);
    expect(Object.isFrozen(vector2(1, 2))).toBe(true);
    expect(Object.isFrozen(size)).toBe(true);
    expect(Object.isFrozen(size.X)).toBe(true);
  });

  it('parses and validates hexadecimal colors', () => {
    expect(color3FromHex('#0a14ff')).toEqual(color3FromRGB(10, 20, 255));
    expect(() => color3FromHex('0a14ff')).toThrow(/#RRGGBB/);
  });

  it('rounds and constrains color components', () => {
    expect(color3FromRGB(-1, 12.6, 300)).toEqual({ R: 0, G: 13, B: 255 });
    expect(() => color3FromRGB(Number.NaN, 0, 0)).toThrow(/finite/);
  });

  it('creates immutable uniform and explicit sequences', () => {
    const red = color3FromRGB(255, 0, 0);
    const green = color3FromRGB(0, 255, 0);
    const blue = color3FromRGB(0, 0, 255);
    const colors = colorSequence(red, green, blue);
    const transparency = numberSequence(
      { Time: 0, Value: 0 },
      { Time: 0.25, Value: 0.5 },
      { Time: 1, Value: 1 },
    );

    expect(colors.map((keypoint) => keypoint.Time)).toEqual([0, 0.5, 1]);
    expect(transparency[1]).toEqual({ Time: 0.25, Value: 0.5 });
    expect(Object.isFrozen(colors)).toBe(true);
    expect(Object.isFrozen(colors[0])).toBe(true);
    expect(() => numberSequence({ Time: 0.2, Value: 0 }, { Time: 1, Value: 1 })).toThrow(
      /begin at 0/,
    );
  });
});
