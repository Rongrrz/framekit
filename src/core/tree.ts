import { assertNodeActive, nodeState, renderNode, type Node, type NodeState } from './node';

/**
 * Adds a node to a parent, moving it from its previous parent when necessary.
 * DOM-backed children are appended to the parent's element after the tree is updated.
 * When the child is a decorator, affected parents render again to recompute their styles.
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
  if (childState.decorate && !parent.element) {
    throw new TypeError('UI decorators must be appended to a DOM-backed node.');
  }
  if (childState.parent === parent) return;

  const previous = childState.parent;
  detachFromParent(child, childState);
  childState.parent = parent;
  parentState.children.push(child);
  if (child.element) parent.element?.append(child.element);
  if (childState.decorate) {
    if (previous) renderNode(previous);
    renderNode(parent);
  }
}

/**
 * Removes a node from its parent and from the DOM without destroying it.
 * Its descendants remain attached to the node and it can be appended again later.
 * Detaching a decorator renders the previous parent again without its styles.
 *
 * @throws When the node has been destroyed.
 */
export function detach(handle: Node): void {
  assertNodeActive(handle);
  const state = nodeState(handle);
  const previous = state.parent;
  detachFromParent(handle, state);
  handle.element?.remove();
  if (previous && state.decorate) renderNode(previous);
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
  return [...nodeState(handle).children];
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
  const direct = state.children.find((child) => nodeState(child).props.Name === name);
  if (direct || !recursive) return direct;
  for (const child of state.children) {
    const result = find(child, name, true);
    if (result) return result;
  }
  return undefined;
}

/** Removes a node from its parent's child list without touching the DOM. */
function detachFromParent(handle: Node, state: NodeState): void {
  if (!state.parent) return;
  const siblings = nodeState(state.parent).children;
  const index = siblings.indexOf(handle);
  if (index >= 0) siblings.splice(index, 1);
  state.parent = undefined;
}

/** Returns whether `candidate` appears in `handle`'s chain of parents. */
function isAncestor(candidate: Node, handle: Node): boolean {
  for (let current = nodeState(handle).parent; current; current = nodeState(current).parent) {
    if (current === candidate) return true;
  }
  return false;
}
