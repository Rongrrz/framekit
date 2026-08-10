import type { Node } from './base';
import { assertNodeActive } from './lifecycle';
import { childNodes, isModifierState, nodeState, type NodeState } from './state';
import { hasLayout, isGuiNode, renderNode, type ModifierNode } from './variants/gui';

/**
 * Adds a node to a parent, moving it from its previous parent when necessary.
 * DOM-backed children are appended to the parent's element after the tree is updated.
 * When the child is a decorator or a parent has a layout, affected parents render again.
 * Calling this with an existing parent-child pair has no effect.
 *
 * @throws When either node is destroyed or the operation would create a cycle.
 */
export function append(parent: Node, child: Node): void {
  assertNodeActive(parent);
  assertNodeActive(child);
  if (parent === child || isAncestor(child, parent)) {
    throw new Error('A node cannot be appended to itself or one of its descendants.');
  }
  const parentState = nodeState(parent);
  const childState = nodeState(child);
  if (isModifierState(parentState)) {
    throw new TypeError('UI modifiers cannot contain child nodes.');
  }
  if (isModifierState(childState) && parentState.kind !== 'gui') {
    throw new TypeError('UI decorators and layouts must be appended to a DOM-backed node.');
  }
  if (childState.parent === parent) return;
  if (isModifierState(childState) && parentState.kind === 'gui') {
    if (parentState.modifiers.has(childState.modifierType)) {
      throw new Error(
        `${parentState.props.Name} already has a ${childState.modifierType} modifier.`,
      );
    }
  }

  const previous = childState.parent;
  detachFromParent(child, childState);
  childState.parent = parent;
  childNodes(parentState).push(child);
  if (isModifierState(childState) && parentState.kind === 'gui') {
    parentState.modifiers.set(childState.modifierType, child as ModifierNode);
  }
  if (isGuiNode(child) && isGuiNode(parent)) parent.element.append(child.element);
  if (previous && (isModifierState(childState) || hasLayout(previous))) {
    renderNode(previous);
  }
  if (isModifierState(childState) || hasLayout(parent)) renderNode(parent);
}

/**
 * Removes a node from its parent and from the DOM without destroying it.
 * Its descendants remain attached to the node and it can be appended again later.
 * Detaching a decorator or a laid-out child renders the previous parent again.
 *
 * @throws When the node has been destroyed.
 */
export function detach(handle: Node): void {
  assertNodeActive(handle);
  const state = nodeState(handle);
  const previous = state.parent;
  detachFromParent(handle, state);
  if (isGuiNode(handle)) handle.element.remove();
  if (previous && (isModifierState(state) || hasLayout(previous))) renderNode(previous);
}

/**
 * Returns the node's current parent, or `undefined` when it is a tree root.
 *
 * @throws When the node has been destroyed.
 */
export function parent(handle: Node): Node | undefined {
  assertNodeActive(handle);
  return nodeState(handle).parent;
}

/**
 * Returns a snapshot of the node's direct children in insertion order.
 * Mutating the returned array cannot modify the FrameKit tree.
 *
 * @throws When the node has been destroyed.
 */
export function children(handle: Node): readonly Node[] {
  assertNodeActive(handle);
  return [...childNodes(nodeState(handle))];
}

/**
 * Finds the first child whose `Name` property matches the requested name.
 * By default only direct children are searched. Recursive searches use depth-first order.
 *
 * @param recursive Whether descendants should also be searched.
 * @returns The first matching node, or `undefined` when no match exists.
 * @throws When the starting node has been destroyed.
 */
export function find(handle: Node, name: string, recursive = false): Node | undefined {
  assertNodeActive(handle);
  const state = nodeState(handle);
  const direct = childNodes(state).find((child) => nodeState(child).props.Name === name);
  if (direct || !recursive) return direct;
  for (const child of childNodes(state)) {
    const result = find(child, name, true);
    if (result) return result;
  }
  return undefined;
}

/** Removes a node from its parent's child list without touching the DOM. */
function detachFromParent(handle: Node, state: NodeState): void {
  if (!state.parent) return;
  const parentState = nodeState(state.parent);
  const siblings = childNodes(parentState);
  const index = siblings.indexOf(handle);
  if (index >= 0) siblings.splice(index, 1);
  if (isModifierState(state) && parentState.kind === 'gui') {
    parentState.modifiers.delete(state.modifierType);
  }
  state.parent = undefined;
}

/** Returns whether `candidate` appears in `handle`'s chain of parents. */
function isAncestor(candidate: Node, handle: Node): boolean {
  for (let current = nodeState(handle).parent; current; current = nodeState(current).parent) {
    if (current === candidate) return true;
  }
  return false;
}
