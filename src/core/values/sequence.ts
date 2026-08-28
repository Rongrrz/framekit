import { assertFiniteNumber } from '../../shared/runtime/validation';
import { assertColor3, type Color3 } from './color3';

/** A color at a normalized point in a ColorSequence. */
export type ColorSequenceKeypoint = Readonly<{
  Time: number;
  Value: Color3;
}>;

/** An immutable color gradient from time 0 to 1. */
export type ColorSequence = readonly ColorSequenceKeypoint[];

/** A number at a normalized point in a NumberSequence. */
export type NumberSequenceKeypoint = Readonly<{
  Time: number;
  Value: number;
}>;

/** An immutable numeric gradient from time 0 to 1. */
export type NumberSequence = readonly NumberSequenceKeypoint[];

/** Creates a color sequence from evenly spaced colors or explicit keypoints. */
export function colorSequence(
  first: Color3 | ColorSequenceKeypoint,
  second: Color3 | ColorSequenceKeypoint,
  ...remaining: readonly (Color3 | ColorSequenceKeypoint)[]
): ColorSequence {
  const values = [first, second, ...remaining];
  const keypoints = isColorSequenceKeypoint(first)
    ? values.map((value) => asColorKeypoint(value))
    : evenlySpace(values.map((value) => asColor(value)));
  assertColorSequence(keypoints);
  return Object.freeze(keypoints.map((keypoint) => Object.freeze(keypoint)));
}

/** Creates a number sequence from evenly spaced values or explicit keypoints. */
export function numberSequence(
  first: number | NumberSequenceKeypoint,
  second: number | NumberSequenceKeypoint,
  ...remaining: readonly (number | NumberSequenceKeypoint)[]
): NumberSequence {
  const values = [first, second, ...remaining];
  const keypoints =
    typeof first === 'number'
      ? evenlySpace(values.map((value) => asNumber(value)))
      : values.map((value) => asNumberKeypoint(value));
  assertNumberSequence(keypoints);
  return Object.freeze(keypoints.map((keypoint) => Object.freeze(keypoint)));
}

export function assertColorSequence(value: unknown): asserts value is ColorSequence {
  assertSequence(value, 'ColorSequence', (keypoint, index) => {
    assertColor3(keypoint.Value as Color3, `ColorSequence[${index}].Value`);
  });
}

export function assertNumberSequence(value: unknown): asserts value is NumberSequence {
  assertSequence(value, 'NumberSequence', (keypoint, index) => {
    assertFiniteNumber(keypoint.Value, `NumberSequence[${index}].Value`);
  });
}

function evenlySpace<Value>(values: readonly Value[]): { Time: number; Value: Value }[] {
  const finalIndex = values.length - 1;
  return values.map((value, index) => ({ Time: index / finalIndex, Value: value }));
}

function assertSequence(
  value: unknown,
  name: string,
  validateValue: (keypoint: Record<string, unknown>, index: number) => void,
): void {
  if (!Array.isArray(value) || value.length < 2) {
    throw new TypeError(`${name} must contain at least two keypoints.`);
  }

  let previousTime = -1;
  for (const [index, candidate] of value.entries()) {
    if (typeof candidate !== 'object' || candidate === null) {
      throw new TypeError(`${name}[${index}] must be a keypoint.`);
    }
    const keypoint = candidate as unknown as Record<string, unknown>;
    assertFiniteNumber(keypoint.Time, `${name}[${index}].Time`);
    if (keypoint.Time < 0 || keypoint.Time > 1 || keypoint.Time <= previousTime) {
      throw new RangeError(`${name} times must increase from 0 to 1.`);
    }
    previousTime = keypoint.Time;
    validateValue(keypoint, index);
  }

  const keypoints = value as readonly { Time: number }[];
  if (keypoints[0]!.Time !== 0 || keypoints.at(-1)!.Time !== 1) {
    throw new RangeError(`${name} must begin at 0 and end at 1.`);
  }
}

function isColorSequenceKeypoint(
  value: Color3 | ColorSequenceKeypoint,
): value is ColorSequenceKeypoint {
  return 'Time' in value;
}

function asColor(value: Color3 | ColorSequenceKeypoint): Color3 {
  if (isColorSequenceKeypoint(value)) {
    throw new TypeError('ColorSequence cannot mix colors and keypoints.');
  }
  return value;
}

function asColorKeypoint(value: Color3 | ColorSequenceKeypoint): ColorSequenceKeypoint {
  if (!isColorSequenceKeypoint(value)) {
    throw new TypeError('ColorSequence cannot mix colors and keypoints.');
  }
  return value;
}

function asNumber(value: number | NumberSequenceKeypoint): number {
  if (typeof value !== 'number') {
    throw new TypeError('NumberSequence cannot mix numbers and keypoints.');
  }
  return value;
}

function asNumberKeypoint(value: number | NumberSequenceKeypoint): NumberSequenceKeypoint {
  if (typeof value === 'number') {
    throw new TypeError('NumberSequence cannot mix numbers and keypoints.');
  }
  return value;
}
