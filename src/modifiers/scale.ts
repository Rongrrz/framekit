import { createStyleModifier, type StyleModifierNode, type Styles } from '../runtime/modifier';
import { mergeProperties, type NodeProperties } from '../runtime/node-state';
import { assertNonNegativeFinite } from '../runtime/validation';

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
  );
}

function resolveScale(properties: Readonly<UIScaleProperties>): Styles {
  assertNonNegativeFinite(properties.Scale, 'UIScale Scale');
  return { scale: String(properties.Scale), 'transform-origin': 'center' };
}
