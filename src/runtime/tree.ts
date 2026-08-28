import type { ModifierNode } from './modifier';
import { assertNodeActive } from './node-lifecycle';
import {
  getChildren,
  getNodeState,
  isModifierState,
  type Node,
  type NodeState,
} from './node-state';
import { hasLayoutModifier, isGuiNode, renderNode } from './render';

/** Adds a node to a parent, moving it from its previous parent when necessary. */
export function append(parent: Node, child: Node): void {
  assertNodeActive(parent);
  assertNodeActive(child);
  if (parent === child || isAncestor(child, parent)) {
    throw new Error('A node cannot be appended to itself or one of its descendants.');
  }

  const parentState = getNodeState(parent);
  const childState = getNodeState(child);
  if (isModifierState(parentState)) {
    throw new TypeError('UI modifiers cannot contain child nodes.');
  }
  if (isModifierState(childState) && parentState.kind !== 'gui') {
    throw new TypeError('UI modifiers must be appended to a DOM-backed node.');
  }
  if (childState.parent === parent) {
    placeChildElement(parent, parentState, child);
    return;
  }
  if (
    isModifierState(childState) &&
    parentState.kind === 'gui' &&
    parentState.modifiers.has(childState.modifierKey)
  ) {
    throw new Error(
      `${parentState.properties.Name} already has a ${childState.modifierKey} modifier.`,
    );
  }

  const previousParent = childState.parent;
  const previousIndex = previousParent
    ? getChildren(getNodeState(previousParent)).indexOf(child)
    : -1;
  unlinkFromParent(child, childState);
  linkToParent(parent, parentState, child, childState);

  try {
    if (previousParent && (isModifierState(childState) || hasLayoutModifier(previousParent))) {
      renderNode(previousParent);
    }
    if (isModifierState(childState) || hasLayoutModifier(parent)) renderNode(parent);
  } catch (error) {
    unlinkFromParent(child, childState);
    if (isGuiNode(child)) child.element.remove();
    if (previousParent) {
      linkToParent(previousParent, getNodeState(previousParent), child, childState, previousIndex);
    }
    restoreRendering(parent, previousParent, error);
  }
}

/** Detaches a node without destroying it or its descendants. */
export function detach(node: Node): void {
  assertNodeActive(node);
  const state = getNodeState(node);
  const previousParent = state.parent;
  unlinkFromParent(node, state);
  if (isGuiNode(node)) node.element.remove();
  if (previousParent && (isModifierState(state) || hasLayoutModifier(previousParent))) {
    renderNode(previousParent);
  }
}

export function getParent(node: Node): Node | undefined {
  assertNodeActive(node);
  return getNodeState(node).parent;
}

export function getClassName(node: Node): string {
  assertNodeActive(node);
  return getNodeState(node).className;
}

/** Reparents a node, or detaches it when `newParent` is undefined. */
export function setParent(node: Node, newParent: Node | undefined): void {
  if (newParent) append(newParent, node);
  else detach(node);
}

/** Returns a snapshot of the node's direct children. */
export function children(node: Node): readonly Node[] {
  assertNodeActive(node);
  return [...getChildren(getNodeState(node))];
}

/** Returns every descendant in depth-first hierarchy order. */
export function descendants(node: Node): readonly Node[] {
  assertNodeActive(node);
  const result: Node[] = [];
  const pending = [...getChildren(getNodeState(node))].reverse();
  while (pending.length > 0) {
    const descendant = pending.pop()!;
    result.push(descendant);
    const descendantChildren = getChildren(getNodeState(descendant));
    for (let index = descendantChildren.length - 1; index >= 0; index -= 1) {
      pending.push(descendantChildren[index]!);
    }
  }
  return result;
}

/** Finds the first child with a matching name, optionally searching all descendants. */
export function findFirstChild(node: Node, name: string, recursive = false): Node | undefined {
  assertNodeActive(node);
  const direct = getChildren(getNodeState(node)).find(
    (child) => getNodeState(child).properties.Name === name,
  );
  if (direct || !recursive) return direct;
  return descendants(node).find((child) => getNodeState(child).properties.Name === name);
}

/** Returns the dot-separated hierarchy path from the root to this node. */
export function getFullName(node: Node): string {
  assertNodeActive(node);
  const names: string[] = [];
  for (let current: Node | undefined = node; current; current = getNodeState(current).parent) {
    names.push(getNodeState(current).properties.Name);
  }
  return names.reverse().join('.');
}

/** Formats a stable, human-readable snapshot of a node hierarchy. */
export function toTreeString(node: Node): string {
  assertNodeActive(node);
  const lines = [formatNode(node)];
  const rootChildren = getChildren(getNodeState(node));
  const pending: TreeLine[] = [];
  pushTreeLines(pending, rootChildren, '');

  while (pending.length > 0) {
    const { current, prefix, isLast } = pending.pop()!;
    lines.push(`${prefix}${isLast ? '└─ ' : '├─ '}${formatNode(current)}`);
    const childPrefix = `${prefix}${isLast ? '   ' : '│  '}`;
    pushTreeLines(pending, getChildren(getNodeState(current)), childPrefix);
  }
  return lines.join('\n');
}

/** Prints the current hierarchy snapshot to the console. */
export function printTree(node: Node): void {
  console.log(toTreeString(node));
}

type TreeLine = { current: Node; prefix: string; isLast: boolean };

function pushTreeLines(pending: TreeLine[], nodes: readonly Node[], prefix: string): void {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    pending.push({ current: nodes[index]!, prefix, isLast: index === nodes.length - 1 });
  }
}

function formatNode(node: Node): string {
  const state = getNodeState(node);
  return `${state.properties.Name} [${state.className}]`;
}

function unlinkFromParent(node: Node, state: NodeState): void {
  if (!state.parent) return;
  const parentState = getNodeState(state.parent);
  const siblings = getChildren(parentState);
  const index = siblings.indexOf(node);
  if (index >= 0) siblings.splice(index, 1);
  if (isModifierState(state) && parentState.kind === 'gui') {
    parentState.modifiers.delete(state.modifierKey);
  }
  state.parent = undefined;
}

function linkToParent(
  parent: Node,
  parentState: NodeState,
  child: Node,
  childState: NodeState,
  index = getChildren(parentState).length,
): void {
  childState.parent = parent;
  const siblings = getChildren(parentState);
  siblings.splice(Math.max(0, Math.min(index, siblings.length)), 0, child);
  if (isModifierState(childState) && parentState.kind === 'gui') {
    parentState.modifiers.set(childState.modifierKey, child as ModifierNode);
  }
  placeChildElement(parent, parentState, child);
}

function placeChildElement(parent: Node, parentState: NodeState, child: Node): void {
  if (!isGuiNode(child) || !isGuiNode(parent) || child.element.parentElement === parent.element) {
    return;
  }
  const siblings = getChildren(parentState);
  const nextGuiSibling = siblings.slice(siblings.indexOf(child) + 1).find(isGuiNode);
  parent.element.insertBefore(child.element, nextGuiSibling?.element ?? null);
}

function restoreRendering(
  parent: Node,
  previousParent: Node | undefined,
  originalError: unknown,
): never {
  try {
    renderNode(parent);
    if (previousParent) renderNode(previousParent);
  } catch (rollbackError) {
    throw new AggregateError(
      [originalError, rollbackError],
      'Appending the node failed, and rendering could not be fully restored.',
    );
  }
  throw originalError;
}

function isAncestor(candidate: Node, node: Node): boolean {
  for (let current = getNodeState(node).parent; current; current = getNodeState(current).parent) {
    if (current === candidate) return true;
  }
  return false;
}
