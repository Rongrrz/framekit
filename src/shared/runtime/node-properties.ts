import { cancelAnimationProperties } from './animation-ownership';
import { validateModifierWithoutParent } from './modifier';
import { assertNodeActive } from './node-lifecycle';
import {
  getNodeState,
  isModifierState,
  validatePropertyPatch,
  type Node,
  type NodeProperties,
} from './node-state';
import { hasLayoutModifier, renderNode } from './render';

/** Applies a user-requested property change, taking control from active animations. */
export function setNodeProperties<Properties extends NodeProperties>(
  node: Node<Properties>,
  patch: Partial<Properties>,
): void {
  const changedProperties = Object.keys(patch);
  applyPropertyPatch(node, patch);
  cancelAnimationProperties(node, changedProperties);
}

/** Applies a property patch without changing animation ownership. */
export function applyPropertyPatch<Properties extends NodeProperties>(
  node: Node<Properties>,
  patch: Partial<Properties>,
): void {
  assertNodeActive(node);
  const state = getNodeState(node);
  const changedProperties = Object.keys(patch) as (keyof Properties)[];
  if (changedProperties.length === 0) return;
  validatePropertyPatch(state.properties, patch);

  const previousProperties = state.properties;
  state.properties = { ...state.properties, ...patch };
  try {
    renderPropertyChanges(node, changedProperties);
  } catch (error) {
    state.properties = previousProperties;
    renderPropertyChanges(node, changedProperties);
    throw error;
  }
}

/** Returns a readonly snapshot used by rendering and animation internals. */
export function getPropertiesSnapshot<Properties extends NodeProperties>(
  node: Node<Properties>,
): Readonly<Properties> {
  assertNodeActive(node);
  return { ...getNodeState(node).properties };
}

/** Reads one current property without allocating a snapshot. */
export function getNodeProperty<
  Properties extends NodeProperties,
  Property extends keyof Properties,
>(node: Node<Properties>, property: Property): Properties[Property] {
  assertNodeActive(node);
  return getNodeState(node).properties[property];
}

function renderPropertyChanges<Properties extends NodeProperties>(
  node: Node<Properties>,
  changedProperties: readonly (keyof Properties)[],
): void {
  const state = getNodeState(node);
  if (isModifierState(state)) {
    if (!state.parent) {
      validateModifierWithoutParent(state);
      return;
    }
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
