import {
  createStyleModifier,
  type StyleModifierNode,
  type Styles,
} from '../../shared/runtime/modifier';
import { mergeProperties, type NodeProperties } from '../../shared/runtime/node-state';
import {
  assertAllowedValue,
  assertBoolean,
  assertFiniteNumber,
} from '../../shared/runtime/validation';
import { color3FromRGB, color3ToCss, type Color3 } from '../values/color3';

/** Where a stroke is drawn relative to its GUI parent's edge. */
export type BorderStrokePosition = 'Inner' | 'Center' | 'Outer';

/** Properties for a border stroke around a GUI parent. */
export type UIStrokeProperties = NodeProperties & {
  /** Whether the modifier currently affects its parent. */
  Enabled: boolean;
  /** Stroke color before transparency is applied. */
  Color: Color3;
  /** Stroke transparency from 0 (opaque) to 1 (invisible). */
  Transparency: number;
  /** Stroke thickness in pixels. */
  Thickness: number;
  /** Placement relative to the parent's edge. */
  BorderStrokePosition: BorderStrokePosition;
};

/** An element-less border-stroke modifier. */
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
