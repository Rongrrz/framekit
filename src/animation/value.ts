import { color3, type Color3 } from '../values/color3';
import { udim, udim2, type UDim, type UDim2 } from '../values/udim';
import { vector2, type Vector2 } from '../values/vector2';

export type AnimationValueKind = 'number' | 'Color3' | 'Vector2' | 'UDim' | 'UDim2';

export type DecomposedAnimationValue = Readonly<{
  kind: AnimationValueKind;
  numbers: number[];
}>;

export function decomposeAnimationValue(
  value: unknown,
  property: string,
): DecomposedAnimationValue {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { kind: 'number', numbers: [value] };
  }
  if (isColor3(value)) return { kind: 'Color3', numbers: [value.R, value.G, value.B] };
  if (isUDim2(value)) {
    return {
      kind: 'UDim2',
      numbers: [value.X.Scale, value.X.Offset, value.Y.Scale, value.Y.Offset],
    };
  }
  if (isUDim(value)) return { kind: 'UDim', numbers: [value.Scale, value.Offset] };
  if (isVector2(value)) return { kind: 'Vector2', numbers: [value.X, value.Y] };
  throw new TypeError(`Property "${property}" does not contain an animatable value.`);
}

export function composeAnimationValue(
  kind: AnimationValueKind,
  numbers: readonly number[],
): number | Color3 | Vector2 | UDim | UDim2 {
  switch (kind) {
    case 'number':
      return numbers[0]!;
    case 'Color3':
      return color3(numbers[0]!, numbers[1]!, numbers[2]!);
    case 'Vector2':
      return vector2(numbers[0]!, numbers[1]!);
    case 'UDim':
      return udim(numbers[0]!, numbers[1]!);
    case 'UDim2':
      return udim2(numbers[0]!, numbers[1]!, numbers[2]!, numbers[3]!);
  }
}

export function assertCompatibleAnimationValues(
  start: DecomposedAnimationValue,
  goal: DecomposedAnimationValue,
  property: string,
): void {
  if (start.kind !== goal.kind) {
    throw new TypeError(`Property "${property}" has incompatible animatable values.`);
  }
}

export function interpolateAnimationValue(
  start: unknown,
  goal: unknown,
  alpha: number,
  property: string,
): number | Color3 | Vector2 | UDim | UDim2 {
  const from = decomposeAnimationValue(start, property);
  const to = decomposeAnimationValue(goal, property);
  assertCompatibleAnimationValues(from, to, property);
  return composeAnimationValue(
    from.kind,
    from.numbers.map((value, index) => value + (to.numbers[index]! - value) * alpha),
  );
}

function isColor3(value: unknown): value is Color3 {
  return hasOnlyNumericKeys(value, ['R', 'G', 'B']);
}

function isVector2(value: unknown): value is Vector2 {
  return hasOnlyNumericKeys(value, ['X', 'Y']);
}

function isUDim(value: unknown): value is UDim {
  return hasOnlyNumericKeys(value, ['Scale', 'Offset']);
}

function isUDim2(value: unknown): value is UDim2 {
  if (!isRecord(value) || Object.keys(value).length !== 2) return false;
  return isUDim(value.X) && isUDim(value.Y);
}

function hasOnlyNumericKeys(value: unknown, keys: readonly string[]): boolean {
  if (!isRecord(value) || Object.keys(value).length !== keys.length) return false;
  return keys.every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
