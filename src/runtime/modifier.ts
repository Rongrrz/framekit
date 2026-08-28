import {
  createBaseState,
  registerNode,
  type BaseNodeState,
  type Node,
  type NodeProps,
} from './state';

declare const styleModifierBrand: unique symbol;
declare const layoutBrand: unique symbol;

export type Styles = Readonly<Record<string, string>>;

/** An element-less node that styles its GUI parent. */
export type StyleModifierNode<Props extends NodeProps = NodeProps> = Node<Props> & {
  readonly [styleModifierBrand]: true;
};

/** An element-less node that lays out its GUI parent's direct children. */
export type LayoutNode<Props extends NodeProps = NodeProps> = Node<Props> & {
  readonly [layoutBrand]: true;
};

export type ResolveStyles<Props extends NodeProps> = (
  props: Readonly<Props>,
  targetProps: Readonly<NodeProps>,
) => Styles;

export type LayoutChild = Readonly<{
  Name: string;
  LayoutOrder: number;
}>;

export type LayoutStyles = Readonly<{
  parent: Styles;
  children: readonly Styles[];
}>;

export type ResolveLayout<Props extends NodeProps> = (
  props: Readonly<Props>,
  children: readonly LayoutChild[],
) => LayoutStyles;

export type StyleModifierState<Props extends NodeProps = NodeProps> = BaseNodeState<Props> & {
  kind: 'style';
  modifierKey: string;
  resolveStyles: ResolveStyles<Props>;
};

export type LayoutNodeState<Props extends NodeProps = NodeProps> = BaseNodeState<Props> & {
  kind: 'layout';
  modifierKey: string;
  resolveLayout: ResolveLayout<Props>;
};

export type ModifierNode = StyleModifierNode | LayoutNode;

/** Creates an element-less modifier that styles its parent. */
export function createStyleModifier<Props extends NodeProps>(
  modifierKey: string,
  props: Props,
  resolveStyles: ResolveStyles<Props>,
): StyleModifierNode<Props> {
  const node = Object.freeze({}) as StyleModifierNode<Props>;
  const state: StyleModifierState<Props> = {
    ...createBaseState(props),
    kind: 'style',
    modifierKey,
    resolveStyles,
  };
  validateModifierWithoutParent(state);
  registerNode(node, state);
  return node;
}

/** Creates an element-less modifier that lays out its parent's children. */
export function createLayoutModifier<Props extends NodeProps>(
  modifierKey: string,
  props: Props,
  resolveLayout: ResolveLayout<Props>,
): LayoutNode<Props> {
  const node = Object.freeze({}) as LayoutNode<Props>;
  const state: LayoutNodeState<Props> = {
    ...createBaseState(props),
    kind: 'layout',
    modifierKey,
    resolveLayout,
  };
  validateModifierWithoutParent(state);
  registerNode(node, state);
  return node;
}

/** Validates modifier properties that do not require a live parent or child list. */
export function validateModifierWithoutParent<Props extends NodeProps>(
  state: StyleModifierState<Props> | LayoutNodeState<Props>,
): void {
  if (state.kind === 'style') state.resolveStyles(state.props, { Name: 'DetachedTarget' });
  else state.resolveLayout(state.props, []);
}
