import { baseState, type BaseNodeState, type Node, type NodeProps } from '../base';
import { registerNode } from '../state';
import type { DecoratorStyles } from './decorator';

declare const layoutBrand: unique symbol;

/** An element-less node that lays out its GUI parent's direct children. */
export type LayoutNode<Props extends NodeProps = NodeProps> = Node<Props> & {
  readonly [layoutBrand]: true;
};

/** The layout-relevant properties exposed for each direct GUI child. */
export type LayoutChild = Readonly<{
  Name: string;
  LayoutOrder: number;
}>;

/** Styles a layout contributes to its parent and each direct GUI child. */
export type LayoutStyles = Readonly<{
  parent: DecoratorStyles;
  children: readonly DecoratorStyles[];
}>;

export type Layout<Props extends NodeProps> = (
  props: Readonly<Props>,
  children: readonly LayoutChild[],
) => LayoutStyles;

export type LayoutNodeState<Props extends NodeProps = NodeProps> = BaseNodeState<Props> & {
  kind: 'layout';
  modifierType: string;
  layout: Layout<Props>;
};

/** Creates an element-less child-layout modifier. */
export function layoutNode<Props extends NodeProps>(
  modifierType: string,
  props: Props,
  layout: Layout<Props>,
): LayoutNode<Props> {
  const handle = Object.freeze({}) as LayoutNode<Props>;
  registerNode(handle, { ...baseState(props), kind: 'layout', modifierType, layout });
  return handle;
}
