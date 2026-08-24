export type Vector2 = Readonly<{
  X: number;
  Y: number;
}>;

export function vector2(x: number, y: number): Vector2 {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new TypeError('Vector2 components must be finite numbers.');
  }
  return Object.freeze({ X: x, Y: y });
}
