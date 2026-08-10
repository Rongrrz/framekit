import { baseState, type BaseNodeState, type Node, type NodeProps } from '../base';
import { nodeState, registerNode } from '../state';
import type { DecoratorNode, DecoratorStyles } from './decorator';
import type { LayoutChild, LayoutNode, LayoutNodeState } from './layout';

/** A node backed by an HTML element. */
export type GuiNode<Props extends NodeProps = NodeProps> = Node<Props> & {
  readonly element: HTMLElement;
};

export type ModifierNode = DecoratorNode | LayoutNode;

export type Render<Props extends NodeProps> = (
  props: Readonly<Props>,
  changed: ReadonlySet<keyof Props>,
) => void;

export type GuiNodeState<Props extends NodeProps = NodeProps> = BaseNodeState<Props> & {
  kind: 'gui';
  children: Node[];
  render: Render<Props> | undefined;
  modifiers: Map<string, ModifierNode>;
  appliedStyles: Set<string>;
  appliedChildStyles: Map<GuiNode, Set<string>>;
};

/** Creates a DOM-backed GUI node. */
export function guiNode<Props extends NodeProps>(
  props: Props,
  element: HTMLElement,
  render?: Render<Props>,
): GuiNode<Props> {
  const handle = Object.freeze({ element }) as GuiNode<Props>;
  registerNode(handle, {
    ...baseState(props),
    kind: 'gui',
    children: [],
    render,
    modifiers: new Map(),
    appliedStyles: new Set(),
    appliedChildStyles: new Map(),
  });
  renderNode(handle, new Set(Object.keys(props) as (keyof Props)[]));
  return handle;
}

/** Returns whether a node is backed by a DOM element. */
export function isGuiNode(handle: Node): handle is GuiNode {
  return nodeState(handle).kind === 'gui';
}

/** Returns whether a GUI node currently contains a layout modifier. */
export function hasLayout(handle: Node): boolean {
  const state = nodeState(handle);
  if (state.kind !== 'gui') return false;
  for (const modifier of state.modifiers.values()) {
    if (nodeState(modifier).kind === 'layout') return true;
  }
  return false;
}

/** Renders a GUI node's base styles followed by its modifier children. */
export function renderNode<Props extends NodeProps>(
  handle: Node<Props>,
  changed: ReadonlySet<keyof Props> = new Set(),
): void {
  const state = nodeState(handle);
  if (state.kind !== 'gui') return;
  const gui = handle as GuiNode<Props>;
  const { element } = gui;

  for (const [child, properties] of state.appliedChildStyles) {
    if (nodeState(child).destroyed) continue;
    for (const property of properties) child.element.style.removeProperty(property);
    renderNode(child);
  }
  state.appliedChildStyles.clear();

  for (const property of state.appliedStyles) element.style.removeProperty(property);
  state.appliedStyles.clear();
  state.render?.(state.props, changed);
  const preserveHiddenDisplay = element.style.display === 'none';

  for (const modifier of state.modifiers.values()) {
    const modifierState = nodeState(modifier);
    if (modifierState.kind === 'decorator') {
      applyStyles(
        element,
        modifierState.decorate(modifierState.props),
        state,
        preserveHiddenDisplay,
      );
    } else if (modifierState.kind === 'layout') {
      applyLayout(gui, modifierState, preserveHiddenDisplay);
    }
  }
}

function applyLayout(
  parent: GuiNode,
  layoutState: LayoutNodeState,
  preserveHiddenDisplay: boolean,
): void {
  const parentState = nodeState(parent);
  if (parentState.kind !== 'gui') return;
  const guiChildren = parentState.children.filter(isGuiNode);
  const childProps = guiChildren.map((child): LayoutChild => {
    const props = nodeState(child).props as NodeProps & { LayoutOrder?: unknown };
    return {
      Name: props.Name,
      LayoutOrder: typeof props.LayoutOrder === 'number' ? props.LayoutOrder : 0,
    };
  });
  const styles = layoutState.layout(layoutState.props, childProps);
  applyStyles(parent.element, styles.parent, parentState, preserveHiddenDisplay);
  for (const [index, child] of guiChildren.entries()) {
    const childStyles = styles.children[index];
    if (!childStyles) continue;
    const appliedProperties = parentState.appliedChildStyles.get(child) ?? new Set<string>();
    for (const [property, value] of Object.entries(childStyles)) {
      child.element.style.setProperty(property, value);
      appliedProperties.add(property);
    }
    parentState.appliedChildStyles.set(child, appliedProperties);
  }
}

function applyStyles(
  element: HTMLElement,
  styles: DecoratorStyles,
  state: Pick<GuiNodeState, 'appliedStyles'>,
  preserveHiddenDisplay: boolean,
): void {
  for (const [property, value] of Object.entries(styles)) {
    if (property === 'display' && preserveHiddenDisplay) continue;
    element.style.setProperty(property, value);
    state.appliedStyles.add(property);
  }
}
