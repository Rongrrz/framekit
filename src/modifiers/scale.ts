import { createStyleModifier, type StyleModifierNode, type Styles } from '../runtime/render';
import { mergeProps, type NodeProps } from '../runtime/state';

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
  if (!Number.isFinite(props.Scale) || props.Scale < 0) {
    throw new TypeError('UIScale Scale must be a non-negative finite number.');
  }
  return { scale: String(props.Scale), 'transform-origin': 'center' };
}
