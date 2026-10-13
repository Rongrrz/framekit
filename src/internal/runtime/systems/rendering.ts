import { placeElement, placeElements } from '#internal/dom/placement.js';
import { setStyleLayer, setStyleLayerProperty } from '#internal/dom/styles.js';

import type { GuiElement } from '../node/gui-node.js';
import type { Instance, InstanceProperties } from '../node/instance.js';
import { getModifierTarget, type LayoutChild, type LayoutStyles } from '../node/modifier-types.js';
import { getNodeState, isGuiNode, isModifierState } from '../node/registry.js';
import { composeStyles, type Styles } from './style-output.js';

type RenderedLayout = Pick<LayoutStyles, 'child' | 'compareChildren'> & {
  children: GuiElement[];
};

// Derived layout output belongs to the renderer. Hierarchy and property changes rebuild it;
// inserting one child can reuse it without resolving or rewriting every sibling.
const layoutsByNode = new WeakMap<Instance, RenderedLayout>();

export function hasLayoutModifier(node: Instance): boolean {
  const state = getNodeState(node);
  if (state.kind !== 'gui') {
    return false;
  }
  for (const modifier of state.modifiers.values()) {
    if (getNodeState(modifier).kind === 'layout') {
      return true;
    }
  }
  return false;
}

/** Renders the node surfaces affected by a committed property change. */
export function renderPropertyChanges<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  changedProperties: ReadonlySet<keyof Properties>,
): void {
  const state = getNodeState(node);
  if (isModifierState(state)) {
    const target = state.parent;
    if (!target) {
      return;
    }

    if (state.kind === 'layout') {
      renderLayouts(target);
    } else {
      renderModifierStyles(target);
    }
    return;
  }

  if (state.kind === 'gui') {
    renderNode(node, changedProperties);
  }
  if (state.parent && affectsParentLayout(changedProperties) && hasLayoutModifier(state.parent)) {
    renderLayouts(state.parent);
  }
}

/** Renders changed base properties and reconciles target-dependent style modifiers. */
export function renderNode<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  changedProperties: ReadonlySet<keyof Properties>,
): void {
  const state = getNodeState(node);
  if (state.kind !== 'gui') {
    return;
  }
  const reconciledProperties = state.renderProperties?.(state.properties, changedProperties);
  if (reconciledProperties) {
    state.properties = { ...state.properties, ...reconciledProperties };
  }
  if (state.modifiers.size > 0) {
    renderModifierStyles(node);
  }
}

function affectsParentLayout<Properties extends InstanceProperties>(
  changedProperties: ReadonlySet<keyof Properties>,
): boolean {
  for (const property of changedProperties) {
    if (property === 'Name' || property === 'LayoutOrder') {
      return true;
    }
  }
  return false;
}

/** Reconciles modifier and layout output without replaying base property renderers. */
export function renderDerivedStyles(node: Instance): void {
  renderModifierStyles(node);
  renderLayouts(node);
}

function renderModifierStyles(node: Instance): void {
  const state = getNodeState(node);
  if (state.kind !== 'gui') {
    return;
  }
  let resolvedStyles: Styles = {};

  for (const modifier of state.modifiers.values()) {
    const modifierState = getNodeState(modifier);
    if (modifierState.kind !== 'style') {
      continue;
    }
    resolvedStyles = composeStyles(
      resolvedStyles,
      modifierState.resolveStyles(modifierState.properties, getModifierTarget(state)),
    );
  }

  setStyleLayer((node as GuiElement).unsafeElement, 'modifier', resolvedStyles);
}

/** Recomputes layout output and removes only declarations no longer produced by a layout. */
function renderLayouts(node: Instance): void {
  const state = getNodeState(node);
  if (state.kind !== 'gui') {
    return;
  }
  const guiNode = node as GuiElement;
  const children = state.children.filter(isGuiNode);
  let parentStyles: Styles = {};
  let childStyles: Styles = {};
  let compareChildren: LayoutStyles['compareChildren'] | undefined;

  for (const modifier of state.modifiers.values()) {
    const modifierState = getNodeState(modifier);
    if (modifierState.kind === 'layout') {
      const resolved = modifierState.resolveLayout(modifierState.properties);
      parentStyles = composeStyles(parentStyles, resolved.parent);
      childStyles = composeStyles(childStyles, resolved.child);
      compareChildren = resolved.compareChildren;
    }
  }

  const previousChildren = layoutsByNode.get(node)?.children ?? [];
  const currentChildren = new Set(children);
  const ordered = [...children];
  const compare = compareChildren;
  if (compare) {
    const propertiesByChild = new Map(
      children.map((child) => [child, getLayoutChildProperties(child)]),
    );
    ordered.sort((left, right) =>
      compare(propertiesByChild.get(left)!, propertiesByChild.get(right)!),
    );
    layoutsByNode.set(node, { child: childStyles, compareChildren: compare, children: ordered });
  } else {
    layoutsByNode.delete(node);
  }
  setStyleLayer(guiNode.unsafeElement, 'layout', parentStyles);
  for (const child of previousChildren) {
    if ((!compare || !currentChildren.has(child)) && !getNodeState(child).destroyed) {
      setStyleLayer(child.unsafeElement, 'parent-layout', {});
    }
  }
  if (compare) {
    for (const [index, child] of ordered.entries()) {
      setStyleLayer(child.unsafeElement, 'parent-layout', { ...childStyles, order: String(index) });
    }
  }
  // Layout sorting affects reading and tab order as well as visual placement. The logical
  // hierarchy retains explicit insertion order, including modifiers and equal-order ties.
  placeElements(
    guiNode.unsafeElement,
    ordered.map((child) => child.unsafeElement),
  );
}

/** Releases derived layout references when their owner is destroyed. */
export function releaseLayout(node: Instance): void {
  layoutsByNode.delete(node);
}

/** Places an appended GUI child synchronously, preserving stable equal-key ordering. */
export function renderInsertedChild(parent: Instance, child: GuiElement): void {
  const layout = layoutsByNode.get(parent);
  if (!layout) {
    renderDerivedStyles(parent);
    return;
  }
  const properties = getLayoutChildProperties(child);
  let start = 0;
  let end = layout.children.length;
  while (start < end) {
    const middle = Math.floor((start + end) / 2);
    if (
      layout.compareChildren(properties, getLayoutChildProperties(layout.children[middle]!)) < 0
    ) {
      end = middle;
    } else {
      start = middle + 1;
    }
  }
  // Record the child before touching DOM so normal hierarchy rollback can clear its layer.
  layout.children.splice(start, 0, child);
  setStyleLayer(child.unsafeElement, 'parent-layout', { ...layout.child, order: String(start) });
  renderChildOrders(layout, start + 1);
  placeElement(
    (parent as GuiElement).unsafeElement,
    child.unsafeElement,
    layout.children[start + 1]?.unsafeElement ?? null,
  );
}

/** Drops a departed child and updates only the ranks after its former position. */
export function renderRemovedChild(parent: Instance, child: GuiElement): void {
  const layout = layoutsByNode.get(parent);
  const index = layout?.children.indexOf(child) ?? -1;
  if (!layout || index < 0) {
    renderDerivedStyles(parent);
    return;
  }
  layout.children.splice(index, 1);
  setStyleLayer(child.unsafeElement, 'parent-layout', {});
  renderChildOrders(layout, index);
}

function renderChildOrders(layout: RenderedLayout, start: number): void {
  for (let index = start; index < layout.children.length; index += 1) {
    setStyleLayerProperty(
      layout.children[index]!.unsafeElement,
      'parent-layout',
      'order',
      String(index),
    );
  }
}

function getLayoutChildProperties(child: GuiElement): LayoutChild {
  const state = getNodeState(child);
  const properties = state.properties;
  const layoutOrder =
    state.kind === 'gui' && state.capabilities.guiObject
      ? (properties as InstanceProperties & { LayoutOrder: number }).LayoutOrder
      : 0;
  return {
    Name: properties.Name,
    LayoutOrder: typeof layoutOrder === 'number' ? layoutOrder : 0,
  };
}
