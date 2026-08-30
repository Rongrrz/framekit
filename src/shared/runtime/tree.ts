import type { Instance } from './node';
import {
  getActiveNodeState,
  getChildren,
  getNodeState,
  isModifierState,
  linkNodeToParent,
  unlinkNodeFromParent,
  type NodeState,
} from './node-state';
import { hasLayoutModifier, isGuiNode, renderNode } from './render';

/** Adds a node to a parent, moving it from its previous parent when necessary. */
export function append(parent: Instance, child: Instance): void {
  const parentState = getActiveNodeState(parent);
  const childState = getActiveNodeState(child);
  if (parent === child || isAncestor(child, parent)) {
    throw new Error('A node cannot be appended to itself or one of its descendants.');
  }

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
  unlinkNodeFromParent(child, childState);
  linkNodeToParent(parent, parentState, child, childState);
  placeChildElement(parent, parentState, child);

  try {
    if (previousParent && (isModifierState(childState) || hasLayoutModifier(previousParent))) {
      renderNode(previousParent);
    }
    if (isModifierState(childState) || hasLayoutModifier(parent)) renderNode(parent);
  } catch (error) {
    unlinkNodeFromParent(child, childState);
    if (isGuiNode(child)) child.element.remove();
    if (previousParent) {
      const previousParentState = getNodeState(previousParent);
      linkNodeToParent(previousParent, previousParentState, child, childState, previousIndex);
      placeChildElement(previousParent, previousParentState, child);
    }
    restoreRendering(parent, previousParent, error);
  }
}

/** Detaches a node without destroying it or its descendants. */
export function detach(node: Instance): void {
  const state = getActiveNodeState(node);
  const previousParent = unlinkNodeFromParent(node, state);
  if (isGuiNode(node)) node.element.remove();
  if (previousParent && (isModifierState(state) || hasLayoutModifier(previousParent))) {
    renderNode(previousParent);
  }
}

export function getParent(node: Instance): Instance | undefined {
  return getActiveNodeState(node).parent;
}

export function getClassName(node: Instance): string {
  return getActiveNodeState(node).className;
}

/** Reparents a node, or detaches it when `newParent` is undefined. */
export function setParent(node: Instance, newParent: Instance | undefined): void {
  if (newParent) append(newParent, node);
  else detach(node);
}

/** Returns a snapshot of the node's direct children. */
export function children(node: Instance): readonly Instance[] {
  return [...getChildren(getActiveNodeState(node))];
}

/** Returns every descendant in depth-first hierarchy order. */
export function descendants(node: Instance): readonly Instance[] {
  const result: Instance[] = [];
  const pending = [...getChildren(getActiveNodeState(node))].reverse();
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
export function findFirstChild(
  node: Instance,
  name: string,
  recursive = false,
): Instance | undefined {
  const direct = getChildren(getActiveNodeState(node)).find(
    (child) => getNodeState(child).properties.Name === name,
  );
  if (direct || !recursive) return direct;
  return descendants(node).find((child) => getNodeState(child).properties.Name === name);
}

/** Returns the dot-separated hierarchy path from the root to this node. */
export function getFullName(node: Instance): string {
  getActiveNodeState(node);
  const names: string[] = [];
  for (let current: Instance | undefined = node; current; current = getNodeState(current).parent) {
    names.push(getNodeState(current).properties.Name);
  }
  return names.reverse().join('.');
}

/** Formats a stable, human-readable snapshot of a node hierarchy. */
export function toTreeString(node: Instance): string {
  const lines = [formatNode(node)];
  const rootChildren = getChildren(getActiveNodeState(node));
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
export function printTree(node: Instance): void {
  console.log(toTreeString(node));
}

type TreeLine = { current: Instance; prefix: string; isLast: boolean };

function pushTreeLines(pending: TreeLine[], nodes: readonly Instance[], prefix: string): void {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    pending.push({ current: nodes[index]!, prefix, isLast: index === nodes.length - 1 });
  }
}

function formatNode(node: Instance): string {
  const state = getNodeState(node);
  return `${state.properties.Name} [${state.className}]`;
}

function placeChildElement(parent: Instance, parentState: NodeState, child: Instance): void {
  if (!isGuiNode(child) || !isGuiNode(parent) || child.element.parentElement === parent.element) {
    return;
  }
  const siblings = getChildren(parentState);
  const nextGuiSibling = siblings.slice(siblings.indexOf(child) + 1).find(isGuiNode);
  parent.element.insertBefore(child.element, nextGuiSibling?.element ?? null);
}

function restoreRendering(
  parent: Instance,
  previousParent: Instance | undefined,
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

function isAncestor(candidate: Instance, node: Instance): boolean {
  for (let current = getNodeState(node).parent; current; current = getNodeState(current).parent) {
    if (current === candidate) return true;
  }
  return false;
}
