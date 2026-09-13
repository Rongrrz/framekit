import { assertNonNegativeFinite } from '../internal/validation';
import type { InstanceProperties } from '../node/instance';
import { createStyleModifier, type StyleModifier, type Styles } from '../node/modifier';
import { mergeProperties } from '../node/properties';

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
