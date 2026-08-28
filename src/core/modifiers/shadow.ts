import {
  createStyleModifier,
  type StyleModifierNode,
  type Styles,
} from '../../shared/runtime/modifier';
import { mergeProperties, type NodeProperties } from '../../shared/runtime/node-state';
import {
  assertBoolean,
  assertFiniteNumber,
  assertNonNegativeFinite,
} from '../../shared/runtime/validation';
import { color3FromRGB, color3ToCss, type Color3 } from '../values/color3';
import { assertVector2, vector2, type Vector2 } from '../values/vector2';

/** Properties for an outer or inset surface shadow. */
export type UIShadowProperties = NodeProperties & {
  /** Whether the modifier currently affects its parent. */
  Enabled: boolean;
  /** Shadow color before transparency is applied. */
  Color: Color3;
  /** Shadow transparency from 0 (opaque) to 1 (invisible). */
  Transparency: number;
  /** Horizontal and vertical shadow displacement in pixels. */
  Offset: Vector2;
  /** Blur radius in pixels. */
  BlurRadius: number;
  /** Signed expansion radius in pixels. */
  SpreadRadius: number;
  /** Draws the shadow inside the parent when true. */
  Inset: boolean;
};

/** An element-less box-shadow modifier. */
export type UIShadowNode = StyleModifierNode<UIShadowProperties>;

/** Creates a drop-shadow modifier that composes with strokes and glows. */
export function createUIShadow(initial: Partial<UIShadowProperties> = {}): UIShadowNode {
  return createStyleModifier(
    'UIShadow',
    mergeProperties(
      {
        Name: 'UIShadow',
        Enabled: true,
        Color: color3FromRGB(0, 0, 0),
        Transparency: 0.5,
        Offset: vector2(0, 8),
        BlurRadius: 16,
        SpreadRadius: 0,
        Inset: false,
      },
      initial,
    ),
    resolveShadowStyles,
  );
}

function resolveShadowStyles(properties: Readonly<UIShadowProperties>): Styles {
  assertBoolean(properties.Enabled, 'Enabled');
  assertBoolean(properties.Inset, 'Inset');
  return properties.Enabled ? { 'box-shadow': resolveShadow(properties) } : {};
}

function resolveShadow(properties: Readonly<UIShadowProperties>): string {
  assertVector2(properties.Offset, 'Offset');
  assertNonNegativeFinite(properties.BlurRadius, 'BlurRadius');
  assertFiniteNumber(properties.SpreadRadius, 'SpreadRadius');
  const inset = properties.Inset ? 'inset ' : '';
  return `${inset}${properties.Offset.X}px ${properties.Offset.Y}px ${properties.BlurRadius}px ${properties.SpreadRadius}px ${color3ToCss(properties.Color, properties.Transparency)}`;
}
