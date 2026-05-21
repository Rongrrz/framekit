export function clamp(toClamp: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError('min must be less than or equal to max');
  }
  return Math.min(max, Math.max(min, toClamp));
}
