import {
  textGradientFillProperty,
  textGradientImageProperty,
} from '../../shared/dom/text-gradient';
import {
  createStyleModifier,
  type StyleModifier,
  type Styles,
} from '../../shared/runtime/modifier';
import type { InstanceProperties } from '../../shared/runtime/node';
import { mergeProperties } from '../../shared/runtime/node-state';
import {
  assertAllowedValue,
  assertBoolean,
  assertFiniteNumber,
} from '../../shared/runtime/validation';
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

/** The visual surface painted by a UIGradient. */
export type GradientTarget = 'Background' | 'Text';

/** Properties for a gradient applied to a GUI parent's background. */
export type UIGradientProperties = InstanceProperties & {
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
  /** Whether the gradient paints the parent's background or rendered text. */
  ApplyTo: GradientTarget;
};

/** An element-less background gradient modifier. */
export type UIGradient = StyleModifier<UIGradientProperties>;

/** Creates a gradient modifier for a GUI parent's background. */
export function createUIGradient(initial: Partial<UIGradientProperties> = {}): UIGradient {
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
        ApplyTo: 'Background',
      },
      initial,
    ),
    resolveGradientStyles,
    validateGradientProperties,
  );
}

function resolveGradientStyles(
  properties: Readonly<UIGradientProperties>,
  targetProperties: Readonly<InstanceProperties>,
): Styles {
  if (properties.ApplyTo === 'Text' && !isTextTarget(targetProperties)) {
    throw new TypeError('A text UIGradient must be attached to a TextLabel or TextButton.');
  }
  if (!properties.Enabled) return {};

  const targetColor = readTargetColor(targetProperties, properties.ApplyTo);
  const targetTransparency = readTargetTransparency(targetProperties, properties.ApplyTo);
  const times = mergeSequenceTimes(properties.Color, properties.Transparency);
  const offset = gradientOffset(properties.Offset, properties.Rotation);
  const cssAngle = properties.Rotation + 90;
  const stops = times.map((time) => {
    const color = multiplyColors(targetColor, sampleColor(properties.Color, time));
    const gradientTransparency = sampleNumber(properties.Transparency, time);
    const transparency = combineTransparency(targetTransparency, gradientTransparency);
    return `${color3ToCss(color, transparency)} ${formatPercentage(time + offset)}`;
  });

  const image = `linear-gradient(${cssAngle}deg, ${stops.join(', ')})`;
  return properties.ApplyTo === 'Text'
    ? {
        [textGradientFillProperty]: 'transparent',
        [textGradientImageProperty]: image,
      }
    : {
        'background-color': 'transparent',
        'background-image': image,
      };
}

function validateGradientProperties(properties: Readonly<UIGradientProperties>): void {
  assertBoolean(properties.Enabled, 'Enabled');
  assertColorSequence(properties.Color);
  assertNumberSequence(properties.Transparency);
  assertFiniteNumber(properties.Rotation, 'Rotation');
  assertVector2(properties.Offset, 'Offset');
  assertAllowedValue(properties.ApplyTo, ['Background', 'Text'], 'ApplyTo');
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

function readTargetColor(properties: Readonly<InstanceProperties>, target: GradientTarget): Color3 {
  if (target === 'Text' && 'TextColor3' in properties) {
    const color = properties.TextColor3;
    assertColor3(color, 'TextColor3');
    return color;
  }
  if (target === 'Background' && 'BackgroundColor3' in properties) {
    const color = properties.BackgroundColor3;
    assertColor3(color, 'BackgroundColor3');
    return color;
  }
  return color3FromRGB(255, 255, 255);
}

function readTargetTransparency(
  properties: Readonly<InstanceProperties>,
  target: GradientTarget,
): number {
  if (target === 'Text' && 'TextTransparency' in properties) {
    return typeof properties.TextTransparency === 'number' ? properties.TextTransparency : 0;
  }
  if (target === 'Background' && 'BackgroundTransparency' in properties) {
    return typeof properties.BackgroundTransparency === 'number'
      ? properties.BackgroundTransparency
      : 0;
  }
  return 0;
}

function isTextTarget(properties: Readonly<InstanceProperties>): boolean {
  return 'Text' in properties && !('MultiLine' in properties);
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
