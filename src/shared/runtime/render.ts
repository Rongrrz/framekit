import { vector2, type Vector2 } from '../../core/values/vector2';
import { guiEventMethods, type GuiEventMethodTable, type GuiEventMethods } from './gui-events';
import type { LayoutChild, LayoutNodeState, Modifier, Styles } from './modifier';
import {
  createNodeHandle,
  extendMethodTable,
  nodeMethods,
  type Instance,
  type InstanceProperties,
} from './node';
import {
  getActiveNodeState,
  createBaseState,
  getNodeState,
  isModifierState,
  registerNode,
  type BaseNodeState,
  type PropertyValidator,
} from './node-state';

/** Browser-computed geometry available on every GUI element. */
export type GuiGeometry = {
  /** Current viewport position in pixels after layout and transforms. */
  readonly AbsolutePosition: Vector2;
  /** Current rendered width and height in pixels. */
  readonly AbsoluteSize: Vector2;
};

/** A FrameKit instance backed by a browser HTMLElement. */
export type GuiElement<Properties extends InstanceProperties = InstanceProperties> =
  Instance<Properties> &
    GuiEventMethods &
    GuiGeometry & {
      /** The low-level DOM escape hatch for browser integrations. */
      readonly element: HTMLElement;
    };

export type PropertyRenderer<Properties extends InstanceProperties> = (
  properties: Readonly<Properties>,
  changedProperties: ReadonlySet<keyof Properties>,
) => void;

export type GuiNodeState<Properties extends InstanceProperties = InstanceProperties> =
  BaseNodeState<Properties> & {
    kind: 'gui';
    children: Instance[];
    renderProperties: PropertyRenderer<Properties> | undefined;
    modifiers: Map<string, Modifier>;
    appliedModifierStyles: Set<string>;
    appliedLayoutStylesByChild: Map<GuiElement, Set<string>>;
  };

/** Creates a DOM-backed node and renders its initial properties. */
export function createGuiNode<Properties extends InstanceProperties>(
  className: string,
  properties: Properties,
  element: HTMLElement,
  renderProperties?: PropertyRenderer<Properties>,
  validateProperties?: PropertyValidator<Properties>,
  eventMethods?: GuiEventMethodTable,
): GuiElement<Properties> {
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

function createGuiNodeHandle<Properties extends InstanceProperties>(
  properties: Readonly<Properties>,
  element: HTMLElement,
  eventMethods: GuiEventMethodTable,
): GuiElement<Properties> {
  const methodTable = getGuiMethodTable(eventMethods);
  return createNodeHandle(properties, methodTable, { element }) as GuiElement<Properties>;
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
      get(this: GuiElement): Vector2 {
        getActiveNodeState(this);
        const bounds = this.element.getBoundingClientRect();
        return vector2(bounds.left, bounds.top);
      },
    },
    AbsoluteSize: {
      get(this: GuiElement): Vector2 {
        getActiveNodeState(this);
        const bounds = this.element.getBoundingClientRect();
        return vector2(bounds.width, bounds.height);
      },
    },
  });
  guiNodeMethods = Object.freeze(methodTable);
  return guiNodeMethods;
}

export function isGuiNode(node: Instance): node is GuiElement {
  return getNodeState(node).kind === 'gui';
}

export function hasLayoutModifier(node: Instance): boolean {
  const state = getNodeState(node);
  if (state.kind !== 'gui') return false;
  for (const modifier of state.modifiers.values()) {
    if (getNodeState(modifier).kind === 'layout') return true;
  }
  return false;
}

/** Renders the node surfaces affected by a committed property change. */
export function renderPropertyChanges<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  changedProperties: readonly (keyof Properties)[],
): void {
  const state = getNodeState(node);
  if (isModifierState(state)) {
    if (!state.parent) return;
    renderNode(state.parent);
    const modifierTargetState = getNodeState(state.parent);
    if (modifierTargetState.parent && hasLayoutModifier(modifierTargetState.parent)) {
      renderNode(modifierTargetState.parent);
    }
    return;
  }
  if (state.kind === 'gui') renderNode(node, new Set(changedProperties));
  if (state.parent && hasLayoutModifier(state.parent)) renderNode(state.parent);
}

/** Renders base properties first, followed by attached modifiers. */
export function renderNode<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  changedProperties: ReadonlySet<keyof Properties> = new Set(),
): void {
  const state = getNodeState(node);
  if (state.kind !== 'gui') return;
  const guiNode = node as GuiElement<Properties>;

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

function clearLayoutStyles<Properties extends InstanceProperties>(
  state: GuiNodeState<Properties>,
): void {
  for (const [child, properties] of state.appliedLayoutStylesByChild) {
    if (getNodeState(child).destroyed) continue;
    clearStyles(child.element, properties);
    renderNode(child);
  }
  state.appliedLayoutStylesByChild.clear();
}

function applyLayout(parent: GuiElement, layout: LayoutNodeState, isHidden: boolean): void {
  const parentState = getNodeState(parent);
  if (parentState.kind !== 'gui') return;
  const children = parentState.children.filter(isGuiNode);
  const childProperties = children.map((child): LayoutChild => {
    const properties = getNodeState(child).properties as InstanceProperties & {
      LayoutOrder?: unknown;
    };
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
