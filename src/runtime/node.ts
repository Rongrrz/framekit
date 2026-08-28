import { validateModifierWithoutParent } from './modifier';
import { hasLayoutModifier, renderNode, type GuiNode } from './render';
import {
  getChildren,
  getNodeState,
  isModifierState,
  validatePropertyPatch,
  type Node,
  type NodeProps,
} from './state';

/** Applies a partial property update and synchronizes rendering. */
export function update<Props extends NodeProps>(node: Node<Props>, patch: Partial<Props>): void {
  assertNodeActive(node);
  const state = getNodeState(node);
  const changedProperties = Object.keys(patch) as (keyof Props)[];
  if (changedProperties.length === 0) return;
  validatePropertyPatch(state.props, patch);

  const previousProps = state.props;
  state.props = { ...state.props, ...patch };
  try {
    renderPropertyChanges(node, changedProperties);
  } catch (error) {
    state.props = previousProps;
    renderPropertyChanges(node, changedProperties);
    throw error;
  }
}

function renderPropertyChanges<Props extends NodeProps>(
  node: Node<Props>,
  changedProperties: readonly (keyof Props)[],
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

/** Returns a readonly snapshot of a node's current properties. */
export function props<Props extends NodeProps>(node: Node<Props>): Readonly<Props> {
  assertNodeActive(node);
  return { ...getNodeState(node).props };
}

/** Recursively destroys a node, its descendants, DOM, and lifecycle resources. */
export function destroy(node: Node): void {
  const errors: unknown[] = [];
  destroyRecursively(node, errors, false);
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1)
    throw new AggregateError(errors, 'Multiple errors occurred while destroying a node.');
}

function destroyRecursively(node: Node, errors: unknown[], parentIsBeingDestroyed: boolean): void {
  const state = getNodeState(node);
  if (state.destroyed) return;
  for (const child of Array.from(getChildren(state))) destroyRecursively(child, errors, true);

  if (state.parent) {
    const previousParent = state.parent;
    const parentState = getNodeState(previousParent);
    const siblings = getChildren(parentState);
    const index = siblings.indexOf(node);
    if (index >= 0) siblings.splice(index, 1);
    if (isModifierState(state) && parentState.kind === 'gui') {
      parentState.modifiers.delete(state.modifierKey);
    }
    state.parent = undefined;
    if (!parentIsBeingDestroyed && (isModifierState(state) || hasLayoutModifier(previousParent))) {
      try {
        renderNode(previousParent);
      } catch (error) {
        errors.push(error);
      }
    }
  }

  state.destroyed = true;
  for (const callback of state.cleanups) {
    try {
      callback();
    } catch (error) {
      errors.push(error);
    }
  }
  state.cleanups.clear();
  if (state.kind === 'gui') {
    try {
      (node as GuiNode).element.remove();
    } catch (error) {
      errors.push(error);
    }
  }
}

export function isDestroyed(node: Node): boolean {
  return getNodeState(node).destroyed;
}

/** Registers a resource to release when the node is destroyed. */
export function addCleanup(node: Node, callback: () => void): () => void {
  assertNodeActive(node);
  const cleanups = getNodeState(node).cleanups;
  cleanups.add(callback);
  return () => cleanups.delete(callback);
}

/** Runs a callback during node destruction, unless the returned function unregisters it first. */
export function onDestroy(node: Node, callback: () => void): () => void {
  return addCleanup(node, callback);
}

export function assertNodeActive(node: Node): void {
  const state = getNodeState(node);
  if (state.destroyed) throw new Error(`${state.props.Name} has been destroyed.`);
}
