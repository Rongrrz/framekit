import { hasLayout, renderNode, type GuiNode } from './render';
import { getChildren, getNodeState, isModifierState, type Node, type NodeProps } from './state';

/** Applies a partial property update and synchronizes rendering. */
export function update<Props extends NodeProps>(node: Node<Props>, patch: Partial<Props>): void {
  assertNodeActive(node);
  const state = getNodeState(node);
  const changed = Object.keys(patch) as (keyof Props)[];
  if (changed.length === 0) return;
  for (const property of changed) {
    if (!Object.hasOwn(state.props, property)) {
      throw new TypeError(`Unknown property "${String(property)}" on ${state.props.Name}.`);
    }
  }

  const previousProps = state.props;
  state.props = { ...state.props, ...patch };
  try {
    synchronizeRendering(node, changed);
  } catch (error) {
    state.props = previousProps;
    synchronizeRendering(node, changed);
    throw error;
  }
}

function synchronizeRendering<Props extends NodeProps>(
  node: Node<Props>,
  changed: readonly (keyof Props)[],
): void {
  const state = getNodeState(node);
  if (isModifierState(state)) {
    if (state.parent) {
      renderNode(state.parent);
      const targetState = getNodeState(state.parent);
      if (targetState.parent && hasLayout(targetState.parent)) renderNode(targetState.parent);
    }
    return;
  }
  if (state.kind === 'gui') renderNode(node, new Set(changed));
  if (state.parent && hasLayout(state.parent)) renderNode(state.parent);
}

/** Returns a readonly snapshot of a node's current properties. */
export function props<Props extends NodeProps>(node: Node<Props>): Readonly<Props> {
  assertNodeActive(node);
  return { ...getNodeState(node).props };
}

/** Recursively destroys a node, its descendants, DOM, and lifecycle resources. */
export function destroy(node: Node): void {
  const state = getNodeState(node);
  if (state.destroyed) return;
  for (const child of Array.from(getChildren(state))) destroy(child);

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
    if (isModifierState(state) || hasLayout(previousParent)) renderNode(previousParent);
  }

  state.destroyed = true;
  for (const callback of state.cleanups) callback();
  state.cleanups.clear();
  if (state.kind === 'gui') (node as GuiNode).element.remove();
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

export function assertNodeActive(node: Node): void {
  const state = getNodeState(node);
  if (state.destroyed) throw new Error(`${state.props.Name} has been destroyed.`);
}
