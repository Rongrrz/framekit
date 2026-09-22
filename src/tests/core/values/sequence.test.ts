import { describe, expect, it } from 'vitest';

import { fk } from '../../../index.js';

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
    expect(fk.numberSequence(10, 20, 30)).toEqual([
      { Time: 0, Value: 10 },
      { Time: 0.5, Value: 20 },
      { Time: 1, Value: 30 },
    ]);
    expect(
      fk.colorSequence(
        { Time: 0, Value: red },
        { Time: 0.25, Value: green },
        { Time: 1, Value: blue },
      ),
    ).toEqual([
      { Time: 0, Value: red },
      { Time: 0.25, Value: green },
      { Time: 1, Value: blue },
    ]);
    expect(transparency[1]).toEqual({ Time: 0.25, Value: 0.5 });
    expect(Object.isFrozen(colors)).toBe(true);
    expect(Object.isFrozen(colors[0])).toBe(true);
    expect(Object.isFrozen(transparency)).toBe(true);
    expect(Object.isFrozen(transparency[1])).toBe(true);
  });

  it.each([
    ['missing start', [0.2, 1], /begin at 0/],
    ['missing end', [0, 0.8], /end at 1/],
    ['duplicate times', [0, 0.5, 0.5, 1], /times must increase/],
    ['descending times', [0, 0.8, 0.2, 1], /times must increase/],
    ['out-of-range times', [0, 1.1, 1], /times must increase/],
    ['non-finite times', [0, Number.NaN, 1], /finite/],
  ] as const)('rejects %s', (_, times, message) => {
    const points = times.map((Time) => ({ Time, Value: 0 }));
    expect(() => fk.numberSequence(points[0]!, points[1]!, ...points.slice(2))).toThrow(message);
  });

  it('rejects non-finite values and malformed color channels', () => {
    expect(() => fk.numberSequence(0, Number.POSITIVE_INFINITY)).toThrow(/finite/);
    expect(() => fk.colorSequence(fk.color3FromRGB(0, 0, 0), { R: 256, G: 0, B: 0 })).toThrow(
      /channels/,
    );
  });

  it('rejects mixed shorthand values and explicit keypoints in either order', () => {
    const red = fk.color3FromRGB(255, 0, 0);
    const blue = fk.color3FromRGB(0, 0, 255);
    expect(() => fk.numberSequence(0, { Time: 1, Value: 1 })).toThrow(/cannot mix/);
    expect(() => fk.numberSequence({ Time: 0, Value: 0 }, 1)).toThrow(/cannot mix/);
    expect(() => fk.colorSequence(red, { Time: 1, Value: blue })).toThrow(/cannot mix/);
    expect(() => fk.colorSequence({ Time: 0, Value: red }, blue)).toThrow(/cannot mix/);
  });
});
