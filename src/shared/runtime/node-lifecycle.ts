import type { Node } from './node';
import {
  getActiveNodeState,
  getChildren,
  getNodeState,
  isModifierState,
  unlinkNodeFromParent,
} from './node-state';
import { hasLayoutModifier, renderNode, type GuiNode } from './render';

/** Recursively destroys a node, its descendants, DOM, and owned resources. */
export function destroy(node: Node): void {
  const errors: unknown[] = [];
  destroyRecursively(node, errors, false);
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) {
    throw new AggregateError(errors, 'Multiple errors occurred while destroying a node.');
  }
}

export function isDestroyed(node: Node): boolean {
  return getNodeState(node).destroyed;
}

/** Registers a resource to release when the node is destroyed. */
export function addCleanup(node: Node, callback: () => void): () => void {
  const cleanups = getActiveNodeState(node).cleanups;
  cleanups.add(callback);
  return () => cleanups.delete(callback);
}

/** Runs a callback during destruction unless the returned function unregisters it first. */
export function onDestroy(node: Node, callback: () => void): () => void {
  return addCleanup(node, callback);
}

function destroyRecursively(node: Node, errors: unknown[], parentIsBeingDestroyed: boolean): void {
  const state = getNodeState(node);
  if (state.destroyed) return;
  for (const child of Array.from(getChildren(state))) destroyRecursively(child, errors, true);

  if (state.parent) {
    const previousParent = unlinkNodeFromParent(node, state)!;
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
