import { createStyleModifier, type StyleModifierNode, type Styles } from '../runtime/modifier';
import { mergeProperties, type NodeProperties } from '../runtime/node-state';
import { assertBoolean, assertFiniteNumber } from '../runtime/validation';

export type UICornerProperties = NodeProperties & {
  Enabled: boolean;
  CornerRadius: number;
};

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
