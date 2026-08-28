import {
  createStyleModifier,
  type StyleModifierNode,
  type Styles,
} from '../../shared/runtime/modifier';
import { mergeProperties, type NodeProperties } from '../../shared/runtime/node-state';
import { assertBoolean, assertFiniteNumber } from '../../shared/runtime/validation';

/** Properties for rounding a GUI parent's corners. */
export type UICornerProperties = NodeProperties & {
  /** Whether the modifier currently affects its parent. */
  Enabled: boolean;
  /** Corner radius in pixels. */
  CornerRadius: number;
};

/** An element-less corner-radius modifier. */
export type UICornerNode = StyleModifierNode<UICornerProperties>;

/** Creates a corner modifier that applies border radius to its GUI parent. */
export function createUICorner(initial: Partial<UICornerProperties> = {}): UICornerNode {
  return createStyleModifier(
    'UICorner',
    mergeProperties({ Name: 'UICorner', Enabled: true, CornerRadius: 0 }, initial),
    resolveCornerStyles,
  );
}

function resolveCornerStyles(properties: Readonly<UICornerProperties>): Styles {
  assertBoolean(properties.Enabled, 'Enabled');
  assertFiniteNumber(properties.CornerRadius, 'CornerRadius');
  return properties.Enabled ? { 'border-radius': `${Math.max(0, properties.CornerRadius)}px` } : {};
}
