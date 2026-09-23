import type { InstanceProperties } from '#internal/runtime/node/instance.js';
import {
  createStyleModifier,
  type StyleModifier,
  type Styles,
} from '#internal/runtime/node/modifier.js';
import { mergeProperties } from '#internal/runtime/systems/properties.js';
import { assertBoolean, assertNonNegativeFinite } from '#internal/validation.js';

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
  return properties.Enabled ? { 'border-radius': `${properties.CornerRadius}px` } : {};
}

function validateCornerProperties(properties: Readonly<UICornerProperties>): void {
  assertBoolean(properties.Enabled, 'Enabled');
  assertNonNegativeFinite(properties.CornerRadius, 'CornerRadius');
}
