import { color3FromRGB, type Color3 } from '#values/color3.js';
import { udim, udim2, type UDim, type UDim2 } from '#values/udim.js';
import { vector2, type Vector2 } from '#values/vector2.js';

export type AnimationValueKind = 'number' | 'Color3' | 'Vector2' | 'UDim' | 'UDim2';

export type DecomposedAnimationValue = Readonly<{
  kind: AnimationValueKind;
  components: number[];
}>;

export function decomposeAnimationValue(
  value: unknown,
  property: string,
): DecomposedAnimationValue {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { kind: 'number', components: [value] };
  }

  if (isColor3(value)) {
    return { kind: 'Color3', components: [value.R, value.G, value.B] };
  }

  if (isUDim2(value)) {
    return {
      kind: 'UDim2',
      components: [value.X.Scale, value.X.Offset, value.Y.Scale, value.Y.Offset],
    };
  }

  if (isUDim(value)) {
    return { kind: 'UDim', components: [value.Scale, value.Offset] };
  }

  if (isVector2(value)) {
    return { kind: 'Vector2', components: [value.X, value.Y] };
  }

  throw new TypeError(`Property "${property}" does not contain an animatable value.`);
}

export function composeAnimationValue(
  kind: AnimationValueKind,
  components: readonly number[],
): number | Color3 | Vector2 | UDim | UDim2 {
  switch (kind) {
    case 'number':
      return components[0]!;
    case 'Color3':
      return color3FromRGB(components[0]!, components[1]!, components[2]!);
    case 'Vector2':
      return vector2(components[0]!, components[1]!);
    case 'UDim':
      return udim(components[0]!, components[1]!);
    case 'UDim2':
      return udim2(components[0]!, components[1]!, components[2]!, components[3]!);
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
  start: DecomposedAnimationValue,
  goal: DecomposedAnimationValue,
  alpha: number,
): number | Color3 | Vector2 | UDim | UDim2 {
  return composeAnimationValue(
    start.kind,
    start.components.map((value, index) => value + (goal.components[index]! - value) * alpha),
  );
}

function isColor3(value: unknown): value is Color3 {
  return hasNumericComponents(value, ['R', 'G', 'B']);
}

function isVector2(value: unknown): value is Vector2 {
  return hasNumericComponents(value, ['X', 'Y']);
}

function isUDim(value: unknown): value is UDim {
  return hasNumericComponents(value, ['Scale', 'Offset']);
}

function isUDim2(value: unknown): value is UDim2 {
  return isRecord(value) && isUDim(value.X) && isUDim(value.Y);
}

function hasNumericComponents(value: unknown, keys: readonly string[]): boolean {
  return (
    isRecord(value) &&
    keys.every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
