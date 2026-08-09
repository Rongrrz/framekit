import { udim, type UDim } from './udim';

/** An immutable two-dimensional scale-and-offset size or position. */
export type UDim2 = Readonly<{
  X: UDim;
  Y: UDim;
}>;

/** Creates an immutable two-dimensional scale-and-offset value. */
export function udim2(xScale: number, xOffset: number, yScale: number, yOffset: number): UDim2 {
  return Object.freeze({ X: udim(xScale, xOffset), Y: udim(yScale, yOffset) });
}

/** Creates a `UDim2` containing only scale components. */
export function udim2FromScale(xScale: number, yScale: number): UDim2 {
  return udim2(xScale, 0, yScale, 0);
}

/** Creates a `UDim2` containing only pixel offsets. */
export function udim2FromOffset(xOffset: number, yOffset: number): UDim2 {
  return udim2(0, xOffset, 0, yOffset);
}
