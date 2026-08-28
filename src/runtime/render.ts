import { guiEventMethods, type GuiEventMethodTable, type GuiEventMethods } from './gui-events';
import type { LayoutChild, LayoutNodeState, ModifierNode, Styles } from './modifier';
import {
  createBaseState,
  getNodeState,
  registerNode,
  type BaseNodeState,
  type Node,
  type NodeProps,
} from './state';

/** A node backed by an HTML element. */
export type GuiNode<Props extends NodeProps = NodeProps> = Node<Props> &
  GuiEventMethods & {
    readonly element: HTMLElement;
  };

export type PropertyRenderer<Props extends NodeProps> = (
  props: Readonly<Props>,
  changedProperties: ReadonlySet<keyof Props>,
) => void;

export type GuiNodeState<Props extends NodeProps = NodeProps> = BaseNodeState<Props> & {
  kind: 'gui';
  children: Node[];
  renderProperties: PropertyRenderer<Props> | undefined;
  modifiers: Map<string, ModifierNode>;
  appliedModifierStyles: Set<string>;
  appliedLayoutStylesByChild: Map<GuiNode, Set<string>>;
};

/** Creates a DOM-backed node and renders its initial properties. */
export function createGuiNode<Props extends NodeProps>(
  props: Props,
  element: HTMLElement,
  renderProperties?: PropertyRenderer<Props>,
  eventMethods?: GuiEventMethodTable,
): GuiNode<Props> {
  const node = createGuiNodeHandle<Props>(element, eventMethods ?? guiEventMethods);
  registerNode(node, {
    ...createBaseState(props),
    kind: 'gui',
    children: [],
    renderProperties,
    modifiers: new Map(),
    appliedModifierStyles: new Set(),
    appliedLayoutStylesByChild: new Map(),
  });
  renderNode(node, new Set(Object.keys(props) as (keyof Props)[]));
  return node;
}

function createGuiNodeHandle<Props extends NodeProps>(
  element: HTMLElement,
  eventMethods: GuiEventMethodTable,
): GuiNode<Props> {
  const handle = Object.assign(Object.create(eventMethods) as object, { element });
  return Object.freeze(handle) as GuiNode<Props>;
}

export function isGuiNode(node: Node): node is GuiNode {
  return getNodeState(node).kind === 'gui';
}

export function hasLayoutModifier(node: Node): boolean {
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
  changedProperties: ReadonlySet<keyof Props> = new Set(),
): void {
  const state = getNodeState(node);
  if (state.kind !== 'gui') return;
  const guiNode = node as GuiNode<Props>;

  clearLayoutStyles(state);
  clearStyles(guiNode.element, state.appliedModifierStyles);
  state.renderProperties?.(state.props, changedProperties);
  const baseRenderHidesElement = guiNode.element.style.display === 'none';
  const resolvedModifierStyles: Record<string, string> = {};
  const layoutModifiers: LayoutNodeState[] = [];

  for (const modifier of state.modifiers.values()) {
    const modifierState = getNodeState(modifier);
    if (modifierState.kind === 'style') {
      mergeStyles(
        resolvedModifierStyles,
        modifierState.resolveStyles(modifierState.props, state.props),
      );
    } else if (modifierState.kind === 'layout') {
      layoutModifiers.push(modifierState);
    }
  }

  applyStyles(
    guiNode.element,
    resolvedModifierStyles,
    state.appliedModifierStyles,
    baseRenderHidesElement,
  );
  for (const layout of layoutModifiers) applyLayout(guiNode, layout, baseRenderHidesElement);
}

function mergeStyles(target: Record<string, string>, source: Styles): void {
  for (const [property, value] of Object.entries(source)) {
    if (property === 'box-shadow' && target[property] && value) {
      target[property] = `${target[property]}, ${value}`;
    } else if (property === 'filter' && target[property] && value) {
      target[property] = `${target[property]} ${value}`;
    } else {
      target[property] = value;
    }
  }
}

function clearLayoutStyles<Props extends NodeProps>(state: GuiNodeState<Props>): void {
  for (const [child, properties] of state.appliedLayoutStylesByChild) {
    if (getNodeState(child).destroyed) continue;
    clearStyles(child.element, properties);
    renderNode(child);
  }
  state.appliedLayoutStylesByChild.clear();
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
  const resolvedLayout = layout.resolveLayout(layout.props, childProps);
  applyStyles(parent.element, resolvedLayout.parent, parentState.appliedModifierStyles, isHidden);

  for (const [index, child] of children.entries()) {
    const childStyles = resolvedLayout.children[index];
    if (!childStyles) continue;
    const appliedProperties =
      parentState.appliedLayoutStylesByChild.get(child) ?? new Set<string>();
    applyStyles(child.element, childStyles, appliedProperties, false);
    parentState.appliedLayoutStylesByChild.set(child, appliedProperties);
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
