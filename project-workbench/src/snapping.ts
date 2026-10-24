/** Artboard-relative rectangles keep snapping independent of viewport zoom. */
export type CanvasRect = Readonly<{ x: number; y: number; width: number; height: number }>;

/** Quantize authored offsets after viewport and rotation transforms, without negative zero. */
export const roundCanvasOffset = (value: number, precision: 0 | 1): number =>
  Number(value.toFixed(precision)) || 0;

const axis = (
  start: number,
  length: number,
  delta: number,
  targets: readonly number[],
  snap: boolean,
  tolerance: number,
): Readonly<{ delta: number; guide?: number }> => {
  let closest = tolerance;
  let correction = 0;
  let guide: number | undefined;

  for (const edge of [start, start + length / 2, start + length]) {
    for (const target of targets) {
      const difference = target - edge - delta;

      if (Math.abs(difference) < closest) {
        closest = Math.abs(difference);
        correction = difference;
        guide = target;
      }
    }
  }

  return {
    delta: snap
      ? guide === undefined
        ? Math.round((start + delta) / 8) * 8 - start
        : delta + correction
      : delta,
    ...(guide === undefined ? {} : { guide }),
  };
};

/** Nearby edges and centers win over the eight-pixel grid; both behaviors can be disabled. */
export const snapTranslation = (
  rect: CanvasRect,
  delta: Readonly<{ x: number; y: number }>,
  targets: readonly CanvasRect[],
  snapping: boolean,
  guides: boolean,
  tolerance = 6,
): Readonly<{ x: number; y: number; vertical?: number; horizontal?: number }> => {
  const x = axis(
    rect.x,
    rect.width,
    delta.x,
    targets.flatMap((target) => [target.x, target.x + target.width / 2, target.x + target.width]),
    snapping,
    snapping ? tolerance : 1,
  );
  const y = axis(
    rect.y,
    rect.height,
    delta.y,
    targets.flatMap((target) => [target.y, target.y + target.height / 2, target.y + target.height]),
    snapping,
    snapping ? tolerance : 1,
  );
  return {
    x: x.delta,
    y: y.delta,
    ...(guides && x.guide !== undefined ? { vertical: x.guide } : {}),
    ...(guides && y.guide !== undefined ? { horizontal: y.guide } : {}),
  };
};
