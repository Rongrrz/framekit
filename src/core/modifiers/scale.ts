import {
  createStyleModifier,
  type StyleModifierNode,
  type Styles,
} from '../../shared/runtime/modifier';
import type { NodeProperties } from '../../shared/runtime/node';
import { mergeProperties } from '../../shared/runtime/node-state';
import { assertNonNegativeFinite } from '../../shared/runtime/validation';

/** Properties for visual scaling without changing layout size. */
export type UIScaleProperties = NodeProperties & {
  /** Visual scale multiplier. */
  Scale: number;
};

/** An element-less visual-scale modifier. */
export type UIScaleNode = StyleModifierNode<UIScaleProperties>;

/** Visually scales a GUI node and its descendants without changing its layout footprint. */
export function createUIScale(initial: Partial<UIScaleProperties> = {}): UIScaleNode {
  return createStyleModifier(
    'UIScale',
    mergeProperties({ Name: 'UIScale', Scale: 1 }, initial),
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
