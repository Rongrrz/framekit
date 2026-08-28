import { createStyleModifier, type StyleModifierNode, type Styles } from '../runtime/modifier';
import { mergeProps, type NodeProps } from '../runtime/state';
import { assertNonNegativeFinite } from '../runtime/validation';

export type UIScaleProps = NodeProps & {
  Scale: number;
};

export type UIScaleNode = StyleModifierNode<UIScaleProps>;

/** Visually scales a GUI node and its descendants without changing its layout footprint. */
export function createUIScale(initial: Partial<UIScaleProps> = {}): UIScaleNode {
  return createStyleModifier(
    'UIScale',
    mergeProps({ Name: 'UIScale', Scale: 1 }, initial),
    resolveScale,
  );
}

function resolveScale(props: Readonly<UIScaleProps>): Styles {
  assertNonNegativeFinite(props.Scale, 'UIScale Scale');
  return { scale: String(props.Scale), 'transform-origin': 'center' };
}
