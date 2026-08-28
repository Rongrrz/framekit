import {
  createStyleModifier,
  type StyleModifierNode,
  type Styles,
} from '../../shared/runtime/modifier';
import type { NodeProperties } from '../../shared/runtime/node';
import { mergeProperties } from '../../shared/runtime/node-state';
import { assertBoolean, assertFiniteNumber } from '../../shared/runtime/validation';
import { assertColor3, color3FromRGB, color3ToCss, type Color3 } from '../values/color3';
import {
  assertColorSequence,
  assertNumberSequence,
  colorSequence,
  numberSequence,
  type ColorSequence,
  type NumberSequence,
} from '../values/sequence';
import { assertVector2, vector2, type Vector2 } from '../values/vector2';

/** Properties for a gradient applied to a GUI parent's background. */
export type UIGradientProperties = NodeProperties & {
  /** Whether the gradient currently affects its parent. */
  Enabled: boolean;
  /** Colors sampled from the beginning to the end of the gradient. */
  Color: ColorSequence;
  /** Roblox-style transparency sampled along the gradient. */
  Transparency: NumberSequence;
  /** Clockwise gradient direction in degrees. */
  Rotation: number;
  /** Normalized translation of the gradient. */
  Offset: Vector2;
};

/** An element-less background gradient modifier. */
export type UIGradientNode = StyleModifierNode<UIGradientProperties>;

/** Creates a gradient modifier for a GUI parent's background. */
export function createUIGradient(initial: Partial<UIGradientProperties> = {}): UIGradientNode {
  return createStyleModifier(
    'UIGradient',
    mergeProperties(
      {
        Name: 'UIGradient',
        Enabled: true,
        Color: colorSequence(color3FromRGB(255, 255, 255), color3FromRGB(255, 255, 255)),
        Transparency: numberSequence(0, 0),
        Rotation: 0,
        Offset: vector2(0, 0),
      },
      initial,
    ),
    resolveGradientStyles,
    validateGradientProperties,
  );
}

function resolveGradientStyles(
  properties: Readonly<UIGradientProperties>,
  targetProperties: Readonly<NodeProperties>,
): Styles {
  if (!properties.Enabled) return {};

  const targetColor = readTargetColor(targetProperties);
  const targetTransparency = readTargetTransparency(targetProperties);
  const times = mergeSequenceTimes(properties.Color, properties.Transparency);
  const offset = gradientOffset(properties.Offset, properties.Rotation);
  const cssAngle = properties.Rotation + 90;
  const stops = times.map((time) => {
    const color = multiplyColors(targetColor, sampleColor(properties.Color, time));
    const gradientTransparency = sampleNumber(properties.Transparency, time);
    const transparency = combineTransparency(targetTransparency, gradientTransparency);
    return `${color3ToCss(color, transparency)} ${formatPercentage(time + offset)}`;
  });

  return {
    'background-color': 'transparent',
    'background-image': `linear-gradient(${cssAngle}deg, ${stops.join(', ')})`,
  };
}

function validateGradientProperties(properties: Readonly<UIGradientProperties>): void {
  assertBoolean(properties.Enabled, 'Enabled');
  assertColorSequence(properties.Color);
  assertNumberSequence(properties.Transparency);
  assertFiniteNumber(properties.Rotation, 'Rotation');
  assertVector2(properties.Offset, 'Offset');
}

function mergeSequenceTimes(
  colors: ColorSequence,
  transparencies: NumberSequence,
): readonly number[] {
  return [...new Set([...colors, ...transparencies].map((keypoint) => keypoint.Time))].sort(
    (first, second) => first - second,
  );
}

function sampleColor(sequence: ColorSequence, time: number): Color3 {
  const [start, end] = surroundingKeypoints(sequence, time);
  const alpha = interpolationAlpha(start.Time, end.Time, time);
  return color3FromRGB(
    interpolate(start.Value.R, end.Value.R, alpha),
    interpolate(start.Value.G, end.Value.G, alpha),
    interpolate(start.Value.B, end.Value.B, alpha),
  );
}

function sampleNumber(sequence: NumberSequence, time: number): number {
  const [start, end] = surroundingKeypoints(sequence, time);
  return interpolate(start.Value, end.Value, interpolationAlpha(start.Time, end.Time, time));
}

function surroundingKeypoints<Keypoint extends { Time: number }>(
  sequence: readonly Keypoint[],
  time: number,
): readonly [Keypoint, Keypoint] {
  const endIndex = sequence.findIndex((keypoint) => keypoint.Time >= time);
  if (endIndex <= 0) return [sequence[0]!, sequence[0]!];
  return [sequence[endIndex - 1]!, sequence[endIndex]!];
}

function interpolationAlpha(start: number, end: number, time: number): number {
  return start === end ? 0 : (time - start) / (end - start);
}

function interpolate(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}

function gradientOffset(offset: Vector2, rotation: number): number {
  const radians = (rotation * Math.PI) / 180;
  return offset.X * Math.cos(radians) + offset.Y * Math.sin(radians);
}

function readTargetColor(properties: Readonly<NodeProperties>): Color3 {
  if ('BackgroundColor3' in properties) {
    const color = properties.BackgroundColor3 as Color3;
    assertColor3(color, 'BackgroundColor3');
    return color;
  }
  return color3FromRGB(255, 255, 255);
}

function readTargetTransparency(properties: Readonly<NodeProperties>): number {
  return 'BackgroundTransparency' in properties &&
    typeof properties.BackgroundTransparency === 'number'
    ? properties.BackgroundTransparency
    : 0;
}

function multiplyColors(first: Color3, second: Color3): Color3 {
  return color3FromRGB(
    (first.R * second.R) / 255,
    (first.G * second.G) / 255,
    (first.B * second.B) / 255,
  );
}

function combineTransparency(first: number, second: number): number {
  return 1 - (1 - first) * (1 - second);
}

function formatPercentage(value: number): string {
  return `${Number((value * 100).toFixed(6))}%`;
}
