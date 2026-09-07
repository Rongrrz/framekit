import { removeStyle, setStyle } from '../dom/styles';
import type { GuiElement } from './gui-node';
import type { LayoutChild, LayoutNodeState, Styles } from './modifier';
import type { Instance, InstanceProperties } from './node';
import { getNodeState, isGuiNode, isModifierState, type GuiNodeState } from './node-state';

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
  changedProperties: ReadonlySet<keyof Properties>,
): void {
  const state = getNodeState(node);
  if (isModifierState(state)) {
    const target = state.parent;
    if (!target) return;

    // Layout updates only affect arrangement; style updates can also change base geometry.
    const renderTarget = state.kind === 'layout' ? renderLayouts : renderNode;
    renderTarget(target);

    const targetParent = getNodeState(target).parent;
    if (targetParent && hasLayoutModifier(targetParent)) renderTarget(targetParent);
    return;
  }

  if (state.kind === 'gui') renderNode(node, changedProperties);
  if (state.parent && hasLayoutModifier(state.parent)) renderLayouts(state.parent);
}

/** Reapplies active layout output without clearing unchanged CSS first. */
export function renderLayouts(node: Instance): void {
  const state = getNodeState(node);
  if (state.kind !== 'gui') return;
  const guiNode = node as GuiElement;
  const isHidden = guiNode.element.style.display === 'none';
  for (const modifier of state.modifiers.values()) {
    const modifierState = getNodeState(modifier);
    if (modifierState.kind === 'layout') applyLayout(guiNode, modifierState, isHidden);
  }
}

/** Renders base properties first, followed by attached modifiers. */
export function renderNode<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  changedProperties: ReadonlySet<keyof Properties> = new Set(),
): void {
  const state = getNodeState(node);
  if (state.kind !== 'gui') return;
  const guiNode = node as GuiElement<Properties>;
  const effectiveChanges = changedProperties.size === 0 ? state.propertyNames : changedProperties;
  const hasDerivedStyles =
    state.modifiers.size > 0 ||
    state.appliedModifierStyles.size > 0 ||
    state.appliedLayoutStylesByChild.size > 0;
  if (!hasDerivedStyles) {
    state.renderProperties?.(state.properties, effectiveChanges);
    return;
  }

  clearLayoutStyles(state);
  clearStyles(guiNode.element, state.appliedModifierStyles);
  // Derived styles can disappear after any dependency changes. Restore the complete base surface
  // before recomposing them so a removed override always reveals the current base value.
  state.renderProperties?.(state.properties, state.propertyNames);
  if (state.modifiers.size === 0) return;
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
  const childProperties = children.map(getLayoutChildProperties);
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
    setStyle(element, property, value);
    applied.add(property);
  }
}

function clearStyles(element: HTMLElement, properties: Set<string>): void {
  for (const property of properties) removeStyle(element, property);
  properties.clear();
}

function getLayoutChildProperties(child: GuiElement): LayoutChild {
  const properties = getNodeState(child).properties;
  const layoutOrder = 'LayoutOrder' in properties ? properties.LayoutOrder : 0;
  return {
    Name: properties.Name,
    LayoutOrder: typeof layoutOrder === 'number' ? layoutOrder : 0,
  };
}
