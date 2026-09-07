import { createStyleModifier, type StyleModifier, type Styles } from '../../runtime/modifier';
import type { InstanceProperties } from '../../runtime/node';
import { mergeProperties } from '../../runtime/node-properties';
import { assertBoolean, assertFiniteNumber } from '../../runtime/validation';

/** Properties for rounding a GUI parent's corners. */
export type UICornerProperties = InstanceProperties & {
  /** Whether the modifier currently affects its parent. */
  Enabled: boolean;
  /** Corner radius in pixels. */
  CornerRadius: number;
};

/** An element-less corner-radius modifier. */
export type UICorner = StyleModifier<UICornerProperties>;

/** Creates a corner modifier that applies border radius to its GUI parent. */
export function createUICorner(initialProperties: Partial<UICornerProperties> = {}): UICorner {
  return createStyleModifier(
    'UICorner',
    mergeProperties({ Name: 'UICorner', Enabled: true, CornerRadius: 0 }, initialProperties),
    resolveCornerStyles,
    validateCornerProperties,
  );
}

function resolveCornerStyles(properties: Readonly<UICornerProperties>): Styles {
  return properties.Enabled ? { 'border-radius': `${Math.max(0, properties.CornerRadius)}px` } : {};
}

function validateCornerProperties(properties: Readonly<UICornerProperties>): void {
  assertBoolean(properties.Enabled, 'Enabled');
  assertFiniteNumber(properties.CornerRadius, 'CornerRadius');
}
