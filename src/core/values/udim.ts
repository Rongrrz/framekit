import { assertFiniteNumber } from '../../shared/runtime/validation';

/** An immutable scale and pixel-offset pair for one axis. */
export type UDim = Readonly<{
  /** Fraction of the parent axis. */
  Scale: number;
  /** Pixel adjustment after scaling. */
  Offset: number;
}>;

/** An immutable two-axis position or size. */
export type UDim2 = Readonly<{
  /** Horizontal scale-and-offset value. */
  X: UDim;
  /** Vertical scale-and-offset value. */
  Y: UDim;
}>;

/** Creates an immutable scale-and-pixel-offset value. */
export function udim(scale: number, offset: number): UDim {
  assertFinite(scale, 'scale');
  assertFinite(offset, 'offset');
  return Object.freeze({ Scale: scale, Offset: offset });
}

/** Creates an immutable two-dimensional scale-and-offset value. */
export function udim2(xScale: number, xOffset: number, yScale: number, yOffset: number): UDim2 {
  return Object.freeze({ X: udim(xScale, xOffset), Y: udim(yScale, yOffset) });
}

/** Creates a UDim2 using only relative scale values. */
export function udim2FromScale(xScale: number, yScale: number): UDim2 {
  return udim2(xScale, 0, yScale, 0);
}

/** Creates a UDim2 using only pixel offsets. */
export function udim2FromOffset(xOffset: number, yOffset: number): UDim2 {
  return udim2(0, xOffset, 0, yOffset);
}

/** Converts a UDim to a safe CSS length. */
export function udimToCss(value: UDim): string {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('UDim must contain finite Scale and Offset values.');
  }
  assertFinite(value.Scale, 'scale');
  assertFinite(value.Offset, 'offset');
  const percent = value.Scale * 100;
  if (value.Offset === 0) return `${percent}%`;
  if (value.Scale === 0) return `${value.Offset}px`;
  const operator = value.Offset < 0 ? '-' : '+';
  return `calc(${percent}% ${operator} ${Math.abs(value.Offset)}px)`;
}

function assertFinite(value: number, name: string): void {
  assertFiniteNumber(value, `UDim ${name}`);
}
