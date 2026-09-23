import type { InstanceProperties } from '#internal/runtime/node/instance.js';
import {
  createStyleModifier,
  type StyleModifier,
  type Styles,
} from '#internal/runtime/node/modifier.js';
import { mergeProperties } from '#internal/runtime/systems/properties.js';
import { assertNonNegativeFinite } from '#internal/validation.js';

/** Properties for visual scaling without changing layout size. */
export type UIScaleProperties = InstanceProperties & {
  /** Visual scale multiplier. */
  Scale: number;
};

/** An element-less visual-scale modifier. */
export type UIScale = StyleModifier<UIScaleProperties>;

/** Visually scales a GUI node and its descendants without changing its layout footprint. */
export function createUIScale(initialProperties: Partial<UIScaleProperties> = {}): UIScale {
  return createStyleModifier(
    'UIScale',
    mergeProperties({ Name: 'UIScale', Scale: 1 }, initialProperties),
    resolveScale,
    validateScaleProperties,
  );
}

function resolveScale(properties: Readonly<UIScaleProperties>): Styles {
  return { scale: String(properties.Scale), 'transform-origin': 'center' };
}

function validateScaleProperties(properties: Readonly<UIScaleProperties>): void {
  assertNonNegativeFinite(properties.Scale, 'UIScale Scale');
}
