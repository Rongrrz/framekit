import type { Node, NodeProps } from './base';
import { childNodes, isModifierState, nodeState } from './state';
import { hasLayout, renderNode, type GuiNode } from './variants/gui';

/** Applies a partial property update and synchronizes the affected rendering. */
export function update<Props extends NodeProps>(handle: Node<Props>, patch: Partial<Props>): void {
  assertNodeActive(handle);
  const state = nodeState(handle);
  const changed = new Set(Object.keys(patch) as (keyof Props)[]);
  if (changed.size === 0) return;
  state.props = { ...state.props, ...patch };
  if (isModifierState(state)) {
    if (state.parent) renderNode(state.parent);
    return;
  }
  if (state.kind === 'gui') renderNode(handle, changed);
  if (state.parent && hasLayout(state.parent)) renderNode(state.parent);
}

/** Returns a readonly snapshot of a node's current properties. */
export function props<Props extends NodeProps>(handle: Node<Props>): Readonly<Props> {
  assertNodeActive(handle);
  return { ...nodeState(handle).props };
}

/** Recursively destroys a node, its descendants, DOM, and lifecycle resources. */
export function destroy(handle: Node): void {
  const state = nodeState(handle);
  if (state.destroyed) return;
  for (const child of Array.from(childNodes(state))) destroy(child);
  if (state.parent) {
    const previous = state.parent;
    const previousState = nodeState(previous);
    const siblings = childNodes(previousState);
    const index = siblings.indexOf(handle);
    if (index >= 0) siblings.splice(index, 1);
    if (isModifierState(state) && previousState.kind === 'gui') {
      previousState.modifiers.delete(state.modifierType);
    }
    state.parent = undefined;
    if (isModifierState(state) || hasLayout(previous)) renderNode(previous);
  }
  state.destroyed = true;
  for (const callback of state.cleanups) callback();
  state.cleanups.clear();
  if (state.kind === 'gui') (handle as GuiNode).element.remove();
}

/** Reports whether a node has been destroyed. */
export function isDestroyed(handle: Node): boolean {
  return nodeState(handle).destroyed;
}

/** Registers resource cleanup with a node's lifecycle. */
export function cleanup(handle: Node, callback: () => void): void {
  assertNodeActive(handle);
  nodeState(handle).cleanups.add(callback);
}

/** Throws when a node can no longer be used. */
export function assertNodeActive(handle: Node): void {
  const state = nodeState(handle);
  if (state.destroyed) throw new Error(`${state.props.Name} has been destroyed.`);
}
