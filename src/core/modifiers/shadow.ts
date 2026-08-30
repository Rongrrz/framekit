import {
  createStyleModifier,
  type StyleModifier,
  type Styles,
} from '../../shared/runtime/modifier';
import type { InstanceProperties } from '../../shared/runtime/node';
import { mergeProperties } from '../../shared/runtime/node-state';
import {
  assertBoolean,
  assertFiniteNumber,
  assertNonNegativeFinite,
} from '../../shared/runtime/validation';
import { assertColor3, color3FromRGB, color3ToCss, type Color3 } from '../values/color3';
import { assertVector2, vector2, type Vector2 } from '../values/vector2';

/** Properties for an outer or inset surface shadow. */
export type UIShadowProperties = InstanceProperties & {
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
export type UIShadow = StyleModifier<UIShadowProperties>;

/** Creates a shadow modifier that composes with strokes and other style modifiers. */
export function createUIShadow(initial: Partial<UIShadowProperties> = {}): UIShadow {
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
    validateShadowProperties,
  );
}

function resolveShadowStyles(properties: Readonly<UIShadowProperties>): Styles {
  return properties.Enabled ? { 'box-shadow': resolveShadow(properties) } : {};
}

function resolveShadow(properties: Readonly<UIShadowProperties>): string {
  const inset = properties.Inset ? 'inset ' : '';
  return `${inset}${properties.Offset.X}px ${properties.Offset.Y}px ${properties.BlurRadius}px ${properties.SpreadRadius}px ${color3ToCss(properties.Color, properties.Transparency)}`;
}

function validateShadowProperties(properties: Readonly<UIShadowProperties>): void {
  assertBoolean(properties.Enabled, 'Enabled');
  assertBoolean(properties.Inset, 'Inset');
  assertVector2(properties.Offset, 'Offset');
  assertNonNegativeFinite(properties.BlurRadius, 'BlurRadius');
  assertFiniteNumber(properties.SpreadRadius, 'SpreadRadius');
  assertColor3(properties.Color, 'Color');
  assertFiniteNumber(properties.Transparency, 'Transparency');
}
