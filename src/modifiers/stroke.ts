import { createStyleModifier, type StyleModifierNode, type Styles } from '../runtime/modifier';
import { mergeProperties, type NodeProperties } from '../runtime/node-state';
import { assertAllowedValue, assertBoolean, assertFiniteNumber } from '../runtime/validation';
import { color3FromRGB, color3ToCss, type Color3 } from '../values/color3';

export type BorderStrokePosition = 'Inner' | 'Center' | 'Outer';

export type UIStrokeProperties = NodeProperties & {
  Enabled: boolean;
  Color: Color3;
  Transparency: number;
  Thickness: number;
  BorderStrokePosition: BorderStrokePosition;
};

export type UIStrokeNode = StyleModifierNode<UIStrokeProperties>;

const borderStrokePositions: readonly BorderStrokePosition[] = ['Inner', 'Center', 'Outer'];

/** Creates a stroke modifier that applies a border effect to its GUI parent. */
export function createUIStroke(initial: Partial<UIStrokeProperties> = {}): UIStrokeNode {
  return createStyleModifier(
    'UIStroke',
    mergeProperties(
      {
        Name: 'UIStroke',
        Enabled: true,
        Color: color3FromRGB(0, 0, 0),
        Transparency: 0,
        Thickness: 1,
        BorderStrokePosition: 'Outer',
      },
      initial,
    ),
    resolveStrokeStyles,
  );
}

function resolveStrokeStyles(properties: Readonly<UIStrokeProperties>): Styles {
  assertBoolean(properties.Enabled, 'Enabled');
  return properties.Enabled ? { 'box-shadow': resolveStrokeShadow(properties) } : {};
}

function resolveStrokeShadow(properties: Readonly<UIStrokeProperties>): string {
  assertAllowedValue(
    properties.BorderStrokePosition,
    borderStrokePositions,
    'BorderStrokePosition',
  );
  assertFiniteNumber(properties.Thickness, 'Thickness');
  const thickness = Math.max(0, properties.Thickness);
  const color = color3ToCss(properties.Color, properties.Transparency);
  if (properties.BorderStrokePosition === 'Inner')
    return `inset 0px 0px 0px ${thickness}px ${color}`;
  if (properties.BorderStrokePosition === 'Outer') return `0px 0px 0px ${thickness}px ${color}`;

  const halfThickness = thickness / 2;
  return `inset 0px 0px 0px ${halfThickness}px ${color}, 0px 0px 0px ${halfThickness}px ${color}`;
}
