import type { Instance } from '../../node/instance.js';
import { getActiveNodeState, getChildren, getNodeState } from '../../node/registry.js';

export const getParent = (node: Instance): Instance | undefined => getActiveNodeState(node).parent;

export const getClassName = (node: Instance): string => getActiveNodeState(node).className;

/** Returns a snapshot of the node's direct children. */
export const children = (node: Instance): readonly Instance[] => [
  ...getChildren(getActiveNodeState(node)),
];

/** Returns every descendant in depth-first hierarchy order. */
export const descendants = (node: Instance): readonly Instance[] => {
  const descendantNodes: Instance[] = [];
  const pending = [...getChildren(getActiveNodeState(node))].reverse();
  while (pending.length > 0) {
    const descendant = pending.pop()!;
    descendantNodes.push(descendant);
    const descendantChildren = getChildren(getNodeState(descendant));
    for (let index = descendantChildren.length - 1; index >= 0; index -= 1) {
      pending.push(descendantChildren[index]!);
    }
  }
  return descendantNodes;
};

/** Finds the first child with a matching name, optionally searching all descendants. */
export const findFirstChild = (
  node: Instance,
  name: string,
  recursive = false,
): Instance | undefined => {
  const matchingChild = getChildren(getActiveNodeState(node)).find(
    (child) => getNodeState(child).properties.Name === name,
  );
  if (matchingChild || !recursive) {
    return matchingChild;
  }
  return descendants(node).find((child) => getNodeState(child).properties.Name === name);
};

/** Returns the dot-separated hierarchy path from the root to this node. */
export const getFullName = (node: Instance): string => {
  getActiveNodeState(node);
  const names: string[] = [];
  for (let current: Instance | undefined = node; current; current = getNodeState(current).parent) {
    names.push(getNodeState(current).properties.Name);
  }
  return names.reverse().join('.');
};
