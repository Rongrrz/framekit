import { createNodeHandle, type Node, type NodeProperties } from './node';
import {
  createBaseState,
  registerNode,
  type BaseNodeState,
  type PropertyValidator,
} from './node-state';

declare const styleModifierBrand: unique symbol;
declare const layoutBrand: unique symbol;

export type Styles = Readonly<Record<string, string>>;

/** An element-less node that styles its GUI parent. */
export type StyleModifierNode<Properties extends NodeProperties = NodeProperties> =
  Node<Properties> & {
    readonly [styleModifierBrand]: true;
  };

/** An element-less node that lays out its GUI parent's direct children. */
export type LayoutNode<Properties extends NodeProperties = NodeProperties> = Node<Properties> & {
  readonly [layoutBrand]: true;
};

export type ResolveStyles<Properties extends NodeProperties> = (
  properties: Readonly<Properties>,
  targetProperties: Readonly<NodeProperties>,
) => Styles;

export type LayoutChild = Readonly<{
  Name: string;
  LayoutOrder: number;
}>;

export type LayoutStyles = Readonly<{
  parent: Styles;
  children: readonly Styles[];
}>;

export type ResolveLayout<Properties extends NodeProperties> = (
  properties: Readonly<Properties>,
  children: readonly LayoutChild[],
) => LayoutStyles;

export type StyleModifierState<Properties extends NodeProperties = NodeProperties> =
  BaseNodeState<Properties> & {
    kind: 'style';
    modifierKey: string;
    resolveStyles: ResolveStyles<Properties>;
  };

export type LayoutNodeState<Properties extends NodeProperties = NodeProperties> =
  BaseNodeState<Properties> & {
    kind: 'layout';
    modifierKey: string;
    resolveLayout: ResolveLayout<Properties>;
  };

export type ModifierNode = StyleModifierNode | LayoutNode;

/** Creates an element-less modifier that styles its parent. */
export function createStyleModifier<Properties extends NodeProperties>(
  modifierKey: string,
  properties: Properties,
  resolveStyles: ResolveStyles<Properties>,
  validateProperties?: PropertyValidator<Properties>,
): StyleModifierNode<Properties> {
  const node = createNodeHandle(properties) as StyleModifierNode<Properties>;
  const state: StyleModifierState<Properties> = {
    ...createBaseState(modifierKey, properties, validateProperties),
    kind: 'style',
    modifierKey,
    resolveStyles,
  };
  registerNode(node, state);
  return node;
}

/** Creates an element-less modifier that lays out its parent's children. */
export function createLayoutModifier<Properties extends NodeProperties>(
  modifierKey: string,
  properties: Properties,
  resolveLayout: ResolveLayout<Properties>,
  validateProperties?: PropertyValidator<Properties>,
): LayoutNode<Properties> {
  const node = createNodeHandle(properties) as LayoutNode<Properties>;
  const state: LayoutNodeState<Properties> = {
    ...createBaseState(modifierKey, properties, validateProperties),
    kind: 'layout',
    modifierKey,
    resolveLayout,
  };
  registerNode(node, state);
  return node;
}
