import {
  createBaseState,
  getNodeState,
  registerNode,
  type BaseNodeState,
  type Node,
  type NodeProps,
} from './state';

declare const styleModifierBrand: unique symbol;
declare const layoutBrand: unique symbol;

export type Styles = Readonly<Record<string, string>>;

/** A node backed by an HTML element. */
export type GuiNode<Props extends NodeProps = NodeProps> = Node<Props> & {
  readonly element: HTMLElement;
};

/** An element-less node that styles its GUI parent. */
export type StyleModifierNode<Props extends NodeProps = NodeProps> = Node<Props> & {
  readonly [styleModifierBrand]: true;
};

/** An element-less node that lays out its GUI parent's direct children. */
export type LayoutNode<Props extends NodeProps = NodeProps> = Node<Props> & {
  readonly [layoutBrand]: true;
};

export type Render<Props extends NodeProps> = (
  props: Readonly<Props>,
  changed: ReadonlySet<keyof Props>,
) => void;

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

export type GuiNodeState<Props extends NodeProps = NodeProps> = BaseNodeState<Props> & {
  kind: 'gui';
  children: Node[];
  render: Render<Props> | undefined;
  modifiers: Map<string, ModifierNode>;
  modifierStyles: Set<string>;
  layoutStyles: Map<GuiNode, Set<string>>;
};

/** Creates a DOM-backed node and renders its initial properties. */
export function createGuiNode<Props extends NodeProps>(
  props: Props,
  element: HTMLElement,
  render?: Render<Props>,
): GuiNode<Props> {
  const node = Object.freeze({ element }) as GuiNode<Props>;
  registerNode(node, {
    ...createBaseState(props),
    kind: 'gui',
    children: [],
    render,
    modifiers: new Map(),
    modifierStyles: new Set(),
    layoutStyles: new Map(),
  });
  renderNode(node, new Set(Object.keys(props) as (keyof Props)[]));
  return node;
}

/** Creates an element-less modifier that styles its parent. */
export function createStyleModifier<Props extends NodeProps>(
  modifierKey: string,
  props: Props,
  resolveStyles: ResolveStyles<Props>,
): StyleModifierNode<Props> {
  const node = Object.freeze({}) as StyleModifierNode<Props>;
  registerNode(node, {
    ...createBaseState(props),
    kind: 'style',
    modifierKey,
    resolveStyles,
  });
  return node;
}

/** Creates an element-less modifier that lays out its parent's children. */
export function createLayoutModifier<Props extends NodeProps>(
  modifierKey: string,
  props: Props,
  resolveLayout: ResolveLayout<Props>,
): LayoutNode<Props> {
  const node = Object.freeze({}) as LayoutNode<Props>;
  registerNode(node, {
    ...createBaseState(props),
    kind: 'layout',
    modifierKey,
    resolveLayout,
  });
  return node;
}

export function isGuiNode(node: Node): node is GuiNode {
  return getNodeState(node).kind === 'gui';
}

export function hasLayout(node: Node): boolean {
  const state = getNodeState(node);
  if (state.kind !== 'gui') return false;
  for (const modifier of state.modifiers.values()) {
    if (getNodeState(modifier).kind === 'layout') return true;
  }
  return false;
}

/** Renders base properties first, followed by attached modifiers. */
export function renderNode<Props extends NodeProps>(
  node: Node<Props>,
  changed: ReadonlySet<keyof Props> = new Set(),
): void {
  const state = getNodeState(node);
  if (state.kind !== 'gui') return;
  const gui = node as GuiNode<Props>;

  clearLayoutStyles(state);
  clearStyles(gui.element, state.modifierStyles);
  state.render?.(state.props, changed);
  const isHidden = gui.element.style.display === 'none';

  for (const modifier of state.modifiers.values()) {
    const modifierState = getNodeState(modifier);
    if (modifierState.kind === 'style') {
      applyStyles(
        gui.element,
        modifierState.resolveStyles(modifierState.props, state.props),
        state.modifierStyles,
        isHidden,
      );
    } else if (modifierState.kind === 'layout') {
      applyLayout(gui, modifierState, isHidden);
    }
  }
}

function clearLayoutStyles<Props extends NodeProps>(state: GuiNodeState<Props>): void {
  for (const [child, properties] of state.layoutStyles) {
    if (getNodeState(child).destroyed) continue;
    clearStyles(child.element, properties);
    renderNode(child);
  }
  state.layoutStyles.clear();
}

function applyLayout(parent: GuiNode, layout: LayoutNodeState, isHidden: boolean): void {
  const parentState = getNodeState(parent);
  if (parentState.kind !== 'gui') return;
  const children = parentState.children.filter(isGuiNode);
  const childProps = children.map((child): LayoutChild => {
    const props = getNodeState(child).props as NodeProps & { LayoutOrder?: unknown };
    return {
      Name: props.Name,
      LayoutOrder: typeof props.LayoutOrder === 'number' ? props.LayoutOrder : 0,
    };
  });
  const styles = layout.resolveLayout(layout.props, childProps);
  applyStyles(parent.element, styles.parent, parentState.modifierStyles, isHidden);

  for (const [index, child] of children.entries()) {
    const childStyles = styles.children[index];
    if (!childStyles) continue;
    const applied = parentState.layoutStyles.get(child) ?? new Set<string>();
    applyStyles(child.element, childStyles, applied, false);
    parentState.layoutStyles.set(child, applied);
  }
}

function applyStyles(
  element: HTMLElement,
  styles: Styles,
  applied: Set<string>,
  preserveHiddenDisplay: boolean,
): void {
  for (const [property, value] of Object.entries(styles)) {
    if (property === 'display' && preserveHiddenDisplay) continue;
    element.style.setProperty(property, value);
    applied.add(property);
  }
}

function clearStyles(element: HTMLElement, properties: Set<string>): void {
  for (const property of properties) element.style.removeProperty(property);
  properties.clear();
}
