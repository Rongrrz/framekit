/** An immutable two-dimensional vector. */
export type Vector2 = Readonly<{
  X: number;
  Y: number;
}>;

/** Creates an immutable two-dimensional vector. */
export function vector2(x: number, y: number): Vector2 {
  return Object.freeze({ X: x, Y: y });
}
