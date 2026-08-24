export type UDim = Readonly<{
  Scale: number;
  Offset: number;
}>;

export type UDim2 = Readonly<{
  X: UDim;
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

export function udim2FromScale(xScale: number, yScale: number): UDim2 {
  return udim2(xScale, 0, yScale, 0);
}

export function udim2FromOffset(xOffset: number, yOffset: number): UDim2 {
  return udim2(0, xOffset, 0, yOffset);
}

/** Converts a UDim to a safe CSS length. */
export function udimToCss(value: UDim): string {
  const percent = value.Scale * 100;
  if (value.Offset === 0) return `${percent}%`;
  if (value.Scale === 0) return `${value.Offset}px`;
  const operator = value.Offset < 0 ? '-' : '+';
  return `calc(${percent}% ${operator} ${Math.abs(value.Offset)}px)`;
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new TypeError(`UDim ${name} must be a finite number.`);
}
