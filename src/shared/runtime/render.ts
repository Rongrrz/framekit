import { vector2, type Vector2 } from '../../core/values/vector2';
import { guiEventMethods, type GuiEventMethodTable, type GuiEventMethods } from './gui-events';
import type { LayoutChild, LayoutNodeState, ModifierNode, Styles } from './modifier';
import {
  createNodeHandle,
  extendMethodTable,
  nodeMethods,
  type Node,
  type NodeProperties,
} from './node';
import {
  createBaseState,
  getNodeState,
  registerNode,
  type BaseNodeState,
  type PropertyValidator,
} from './node-state';

/** Browser-computed geometry available on every GUI node. */
export type GuiGeometry = {
  /** Current viewport position in pixels after layout and transforms. */
  readonly AbsolutePosition: Vector2;
  /** Current rendered width and height in pixels. */
  readonly AbsoluteSize: Vector2;
};

/** A FrameKit node backed by a browser HTMLElement. */
export type GuiNode<Properties extends NodeProperties = NodeProperties> = Node<Properties> &
  GuiEventMethods &
  GuiGeometry & {
    /** The low-level DOM escape hatch for browser integrations. */
    readonly element: HTMLElement;
  };

export type PropertyRenderer<Properties extends NodeProperties> = (
  properties: Readonly<Properties>,
  changedProperties: ReadonlySet<keyof Properties>,
) => void;

export type GuiNodeState<Properties extends NodeProperties = NodeProperties> =
  BaseNodeState<Properties> & {
    kind: 'gui';
    children: Node[];
    renderProperties: PropertyRenderer<Properties> | undefined;
    modifiers: Map<string, ModifierNode>;
    appliedModifierStyles: Set<string>;
    appliedLayoutStylesByChild: Map<GuiNode, Set<string>>;
  };

/** Creates a DOM-backed node and renders its initial properties. */
export function createGuiNode<Properties extends NodeProperties>(
  className: string,
  properties: Properties,
  element: HTMLElement,
  renderProperties?: PropertyRenderer<Properties>,
  validateProperties?: PropertyValidator<Properties>,
  eventMethods?: GuiEventMethodTable,
): GuiNode<Properties> {
  const node = createGuiNodeHandle<Properties>(
    properties,
    element,
    eventMethods ?? guiEventMethods,
  );
  registerNode(node, {
    ...createBaseState(className, properties, validateProperties),
    kind: 'gui',
    children: [],
    renderProperties,
    modifiers: new Map(),
    appliedModifierStyles: new Set(),
    appliedLayoutStylesByChild: new Map(),
  });
  renderNode(node, new Set(Object.keys(properties) as (keyof Properties)[]));
  return node;
}

function createGuiNodeHandle<Properties extends NodeProperties>(
  properties: Readonly<Properties>,
  element: HTMLElement,
  eventMethods: GuiEventMethodTable,
): GuiNode<Properties> {
  const methodTable = getGuiMethodTable(eventMethods);
  return createNodeHandle(properties, methodTable, { element }) as GuiNode<Properties>;
}

const guiMethodTables = new WeakMap<object, object>();

function getGuiMethodTable(eventMethods: GuiEventMethodTable): object {
  const existing = guiMethodTables.get(eventMethods);
  if (existing) return existing;
  const methodTable = extendMethodTable(getGuiNodeMethods(), eventMethods);
  guiMethodTables.set(eventMethods, methodTable);
  return methodTable;
}

let guiNodeMethods: object | undefined;

function getGuiNodeMethods(): object {
  if (guiNodeMethods) return guiNodeMethods;

  const methodTable = Object.create(nodeMethods) as object;
  Object.defineProperties(methodTable, {
    AbsolutePosition: {
      get(this: GuiNode): Vector2 {
        assertGuiNodeActive(this);
        const bounds = this.element.getBoundingClientRect();
        return vector2(bounds.left, bounds.top);
      },
    },
    AbsoluteSize: {
      get(this: GuiNode): Vector2 {
        assertGuiNodeActive(this);
        const bounds = this.element.getBoundingClientRect();
        return vector2(bounds.width, bounds.height);
      },
    },
  });
  guiNodeMethods = Object.freeze(methodTable);
  return guiNodeMethods;
}

function assertGuiNodeActive(node: GuiNode): void {
  const state = getNodeState(node);
  if (state.destroyed) throw new Error(`${state.properties.Name} has been destroyed.`);
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
export function renderNode<Properties extends NodeProperties>(
  node: Node<Properties>,
  changedProperties: ReadonlySet<keyof Properties> = new Set(),
): void {
  const state = getNodeState(node);
  if (state.kind !== 'gui') return;
  const guiNode = node as GuiNode<Properties>;

  clearLayoutStyles(state);
  clearStyles(guiNode.element, state.appliedModifierStyles);
  state.renderProperties?.(state.properties, changedProperties);
  const baseRenderHidesElement = guiNode.element.style.display === 'none';
  const resolvedModifierStyles: Record<string, string> = {};
  const layoutModifiers: LayoutNodeState[] = [];

  for (const modifier of state.modifiers.values()) {
    const modifierState = getNodeState(modifier);
    if (modifierState.kind === 'style') {
      mergeStyles(
        resolvedModifierStyles,
        modifierState.resolveStyles(modifierState.properties, state.properties),
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

function clearLayoutStyles<Properties extends NodeProperties>(
  state: GuiNodeState<Properties>,
): void {
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
  const childProperties = children.map((child): LayoutChild => {
    const properties = getNodeState(child).properties as NodeProperties & { LayoutOrder?: unknown };
    return {
      Name: properties.Name,
      LayoutOrder: typeof properties.LayoutOrder === 'number' ? properties.LayoutOrder : 0,
    };
  });
  const resolvedLayout = layout.resolveLayout(layout.properties, childProperties);
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
