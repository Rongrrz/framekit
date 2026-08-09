/** Constrains a number to an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError('min must be less than or equal to max');
  }
  return Math.min(max, Math.max(min, value));
}

/** Rounds a number and constrains it to the unsigned 8-bit integer range. */
export function clampColor(value: number): number {
  return Math.round(clamp(value, 0, 255));
}
