import { createStyleModifier, type StyleModifierNode, type Styles } from '../runtime/modifier';
import { mergeProps, type NodeProps } from '../runtime/state';
import { assertBoolean, assertFiniteNumber } from '../runtime/validation';

export type UICornerProps = NodeProps & {
  Enabled: boolean;
  CornerRadius: number;
};

export type UICornerNode = StyleModifierNode<UICornerProps>;

/** Creates a corner modifier that applies border radius to its GUI parent. */
export function createUICorner(initial: Partial<UICornerProps> = {}): UICornerNode {
  return createStyleModifier(
    'UICorner',
    mergeProps({ Name: 'UICorner', Enabled: true, CornerRadius: 0 }, initial),
    resolveCornerStyles,
  );
}

function resolveCornerStyles(props: Readonly<UICornerProps>): Styles {
  assertBoolean(props.Enabled, 'Enabled');
  assertFiniteNumber(props.CornerRadius, 'CornerRadius');
  return props.Enabled ? { 'border-radius': `${Math.max(0, props.CornerRadius)}px` } : {};
}
