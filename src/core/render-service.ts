import { setStyleLayer } from './dom/styles';
import type { GuiElement } from './node/gui-node';
import type { Instance, InstanceProperties } from './node/instance';
import { getModifierTarget, type LayoutChild, type LayoutNodeState } from './node/modifier';
import { getNodeState, isGuiNode, isModifierState } from './node/state';
import { composeStyles, type Styles } from './node/style-output';

function hasLayoutModifier(node: Instance): boolean {
  const state = getNodeState(node);
  if (state.kind !== 'gui') return false;
  for (const modifier of state.modifiers.values()) {
    if (getNodeState(modifier).kind === 'layout') return true;
  }
  return false;
}

/** Renders the node surfaces affected by a committed property change. */
function renderPropertyChanges<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  changedProperties: ReadonlySet<keyof Properties>,
): void {
  const state = getNodeState(node);
  if (isModifierState(state)) {
    const target = state.parent;
    if (!target) return;

    if (state.kind === 'layout') renderLayouts(target);
    else renderModifierStyles(target);

    const targetParent = getNodeState(target).parent;
    if (targetParent && hasLayoutModifier(targetParent)) renderLayouts(targetParent);
    return;
  }

  if (state.kind === 'gui') renderNode(node, changedProperties);
  if (state.parent && hasLayoutModifier(state.parent)) renderLayouts(state.parent);
}

/** Renders changed base properties and then reconciles both derived style layers. */
function renderNode<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  changedProperties: ReadonlySet<keyof Properties>,
): void {
  const state = getNodeState(node);
  if (state.kind !== 'gui') return;
  state.renderProperties?.(state.properties, changedProperties);
  renderDerivedStyles(node);
}

/** Reconciles modifier and layout output without replaying base property renderers. */
function renderDerivedStyles(node: Instance): void {
  renderModifierStyles(node);
  renderLayouts(node);
}

function renderModifierStyles(node: Instance): void {
  const state = getNodeState(node);
  if (state.kind !== 'gui') return;
  let resolvedStyles: Styles = {};

  for (const modifier of state.modifiers.values()) {
    const modifierState = getNodeState(modifier);
    if (modifierState.kind !== 'style') continue;
    resolvedStyles = composeStyles(
      resolvedStyles,
      modifierState.resolveStyles(modifierState.properties, getModifierTarget(state)),
    );
  }

  setStyleLayer((node as GuiElement).element, 'modifier', resolvedStyles);
}

/** Recomputes layout output and removes only declarations no longer produced by a layout. */
function renderLayouts(node: Instance): void {
  const state = getNodeState(node);
  if (state.kind !== 'gui') return;
  const guiNode = node as GuiElement;
  const children = state.children.filter(isGuiNode);
  const childProperties = children.map(getLayoutChildProperties);
  let parentStyles: Styles = {};
  const stylesByChild = new Map<GuiElement, Styles>();
  const layouts: LayoutNodeState[] = [];

  for (const modifier of state.modifiers.values()) {
    const modifierState = getNodeState(modifier);
    if (modifierState.kind === 'layout') layouts.push(modifierState);
  }

  for (const layout of layouts) {
    const resolved = layout.resolveLayout(layout.properties, childProperties);
    parentStyles = composeStyles(parentStyles, resolved.parent);
    for (const [index, child] of children.entries()) {
      const childStyles = resolved.children[index];
      if (!childStyles) continue;
      stylesByChild.set(child, composeStyles(stylesByChild.get(child) ?? {}, childStyles));
    }
  }

  setStyleLayer(guiNode.element, 'layout', parentStyles);
  const previousChildren = state.layoutChildren;
  const nextChildren = layouts.length > 0 ? new Set(children) : new Set<GuiElement>();
  for (const child of new Set([...previousChildren, ...nextChildren])) {
    if (getNodeState(child).destroyed) continue;
    setStyleLayer(child.element, 'layout', stylesByChild.get(child) ?? {});
  }
  state.layoutChildren = nextChildren;
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

/** Owns the synchronous DOM projection of FrameKit node state. */
export const RenderService = Object.freeze({
  renderPropertyChanges,
  renderNode,
  renderDerivedStyles,
  renderLayouts,
  hasLayoutModifier,
});
