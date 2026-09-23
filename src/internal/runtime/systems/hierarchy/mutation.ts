import type { Instance } from '../../node/instance.js';
import { getModifierTarget, type Modifier } from '../../node/modifier-types.js';
import {
  getActiveNodeState,
  getChildren,
  getNodeState,
  isGuiNode,
  isModifierState,
  type NodeState,
} from '../../node/registry.js';
import * as rendering from '../rendering.js';
import { placeChildElement } from './placement.js';

/** Reparents a node, or detaches it when `newParent` is undefined. */
export const setParent = (node: Instance, newParent: Instance | undefined): void => {
  if (newParent) {
    append(newParent, node);
  } else {
    detach(node);
  }
};

/** Removes a node from the authoritative hierarchy state and returns its previous parent. */
export const unlinkNodeFromParent = (node: Instance, state: NodeState): Instance | undefined => {
  const previousParent = state.parent;
  if (!previousParent) {
    return undefined;
  }

  const parentState = getNodeState(previousParent);
  const siblings = getChildren(parentState);
  const index = siblings.indexOf(node);
  if (index >= 0) {
    siblings.splice(index, 1);
  }
  if (isModifierState(state) && parentState.kind === 'gui') {
    parentState.modifiers.delete(state.className);
  }
  state.parent = undefined;
  return previousParent;
};

const append = (parent: Instance, child: Instance): void => {
  const parentState = getActiveNodeState(parent);
  const childState = getActiveNodeState(child);
  if (parent === child || isAncestor(child, parent)) {
    throw new Error('A node cannot be appended to itself or one of its descendants.');
  }
  if (!childState.canHaveParent) {
    throw new TypeError(`${childState.properties.Name} must remain a hierarchy root.`);
  }
  if (isModifierState(parentState)) {
    throw new TypeError('UI modifiers cannot contain child nodes.');
  }
  if (parentState.kind === 'gui' && isGuiNode(child) && !parentState.canContainGuiChildren) {
    throw new TypeError(`${parentState.properties.Name} cannot contain GUI children.`);
  }
  if (
    isGuiNode(parent) &&
    isGuiNode(child) &&
    parent.unsafeElement.ownerDocument !== child.unsafeElement.ownerDocument
  ) {
    throw new TypeError('GUI parent and child must belong to the same document.');
  }
  if (childState.kind === 'style') {
    childState.validateTarget?.(childState.properties, getModifierTarget(parentState));
  }
  if (childState.parent === parent) {
    placeChildElement(parent, parentState, child, getChildren(parentState).indexOf(child));
    return;
  }
  if (isModifierState(childState) && parentState.modifiers.has(childState.className)) {
    throw new Error(
      `${parentState.properties.Name} already has a ${childState.className} modifier.`,
    );
  }

  const previousParent = childState.parent;
  const previousIndex = previousParent
    ? getChildren(getNodeState(previousParent)).indexOf(child)
    : -1;
  try {
    unlinkNodeFromParent(child, childState);
    const insertionIndex = linkNodeToParent(parent, parentState, child, childState);
    placeChildElement(parent, parentState, child, insertionIndex);
    if (
      previousParent &&
      (isModifierState(childState) || rendering.hasLayoutModifier(previousParent))
    ) {
      rendering.renderDerivedStyles(previousParent);
    }
    if (isModifierState(childState) || rendering.hasLayoutModifier(parent)) {
      rendering.renderDerivedStyles(parent);
    }
  } catch (error) {
    if (childState.parent === parent) {
      unlinkNodeFromParent(child, childState);
    }
    if (
      isGuiNode(child) &&
      isGuiNode(parent) &&
      child.unsafeElement.parentElement === parent.unsafeElement
    ) {
      child.unsafeElement.remove();
    }
    if (previousParent && childState.parent !== previousParent) {
      const previousParentState = getNodeState(previousParent);
      const restoredIndex = linkNodeToParent(
        previousParent,
        previousParentState,
        child,
        childState,
        previousIndex,
      );
      placeChildElement(previousParent, previousParentState, child, restoredIndex);
    }
    restoreRendering(
      parent,
      previousParent,
      error,
      'Appending the node failed, and rendering could not be fully restored.',
    );
  }
};

const detach = (node: Instance): void => {
  const state = getActiveNodeState(node);
  if (!state.canHaveParent) {
    return;
  }
  const previousParent = state.parent;
  if (!previousParent) {
    return;
  }
  const previousParentState = getNodeState(previousParent);
  const previousIndex = getChildren(previousParentState).indexOf(node);

  try {
    unlinkNodeFromParent(node, state);
    if (isGuiNode(node)) {
      node.unsafeElement.remove();
    }
    if (isModifierState(state) || rendering.hasLayoutModifier(previousParent)) {
      rendering.renderDerivedStyles(previousParent);
    }
  } catch (error) {
    if (state.parent !== previousParent) {
      const restoredIndex = linkNodeToParent(
        previousParent,
        previousParentState,
        node,
        state,
        previousIndex,
      );
      placeChildElement(previousParent, previousParentState, node, restoredIndex);
    }
    restoreRendering(
      previousParent,
      undefined,
      error,
      'Detaching the node failed, and rendering could not be fully restored.',
    );
  }
};

const restoreRendering = (
  parent: Instance,
  previousParent: Instance | undefined,
  originalError: unknown,
  rollbackMessage: string,
): never => {
  try {
    rendering.renderDerivedStyles(parent);
    if (previousParent) {
      rendering.renderDerivedStyles(previousParent);
    }
  } catch (rollbackError) {
    throw new AggregateError([originalError, rollbackError], rollbackMessage);
  }
  throw originalError;
};

const isAncestor = (candidate: Instance, node: Instance): boolean => {
  for (let current = getNodeState(node).parent; current; current = getNodeState(current).parent) {
    if (current === candidate) {
      return true;
    }
  }
  return false;
};

const linkNodeToParent = (
  parent: Instance,
  parentState: NodeState,
  child: Instance,
  childState: NodeState,
  index = getChildren(parentState).length,
): number => {
  childState.parent = parent;
  const siblings = getChildren(parentState);
  const insertionIndex = Math.max(0, Math.min(index, siblings.length));
  if (insertionIndex === siblings.length) {
    siblings.push(child);
  } else {
    siblings.splice(insertionIndex, 0, child);
  }
  if (isModifierState(childState) && parentState.kind === 'gui') {
    parentState.modifiers.set(childState.className, child as Modifier);
  }
  return insertionIndex;
};
