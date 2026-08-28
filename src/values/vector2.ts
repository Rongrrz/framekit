export type Vector2 = Readonly<{
  X: number;
  Y: number;
}>;

export function vector2(x: number, y: number): Vector2 {
  assertFiniteNumber(x, 'Vector2 X');
  assertFiniteNumber(y, 'Vector2 Y');
  return Object.freeze({ X: x, Y: y });
}

export function assertVector2(value: unknown, propertyName: string): asserts value is Vector2 {
  if (typeof value !== 'object' || value === null || !('X' in value) || !('Y' in value)) {
    throw new TypeError(`${propertyName} must be a Vector2.`);
  }
  assertFiniteNumber(value.X, `${propertyName}.X`);
  assertFiniteNumber(value.Y, `${propertyName}.Y`);
}
import { assertFiniteNumber } from '../runtime/validation';
