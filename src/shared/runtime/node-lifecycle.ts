import type { Instance } from './node';
import {
  getActiveNodeState,
  getChildren,
  getNodeState,
  isModifierState,
  unlinkNodeFromParent,
} from './node-state';
import { hasLayoutModifier, renderNode, type GuiElement } from './render';

/** Recursively destroys a node, its descendants, DOM, and owned resources. */
export function destroy(node: Instance): void {
  const errors: unknown[] = [];
  destroyRecursively(node, errors, false, undefined);
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) {
    throw new AggregateError(errors, 'Multiple errors occurred while destroying a node.');
  }
}

export function isDestroyed(node: Instance): boolean {
  return getNodeState(node).destroyed;
}

/** Registers a resource to release when the node is destroyed. */
export function addCleanup(node: Instance, callback: () => void): () => void {
  const cleanups = getActiveNodeState(node).cleanups;
  cleanups.add(callback);
  return () => cleanups.delete(callback);
}

/** Runs a callback during destruction unless the returned function unregisters it first. */
export function onDestroy(node: Instance, callback: () => void): () => void {
  return addCleanup(node, callback);
}

function destroyRecursively(
  node: Instance,
  errors: unknown[],
  parentIsBeingDestroyed: boolean,
  ancestorElementBeingRemoved: HTMLElement | undefined,
): void {
  const state = getNodeState(node);
  if (state.destroyed) return;
  const children = getChildren(state);
  const descendantElementOwner =
    ancestorElementBeingRemoved ??
    (state.kind === 'gui' ? (node as GuiElement).element : undefined);
  for (const child of children) {
    getNodeState(child).parent = undefined;
    destroyRecursively(child, errors, true, descendantElementOwner);
  }
  children.length = 0;

  if (state.parent && !parentIsBeingDestroyed) {
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
      const element = (node as GuiElement).element;
      if (!ancestorElementBeingRemoved?.contains(element)) element.remove();
    } catch (error) {
      errors.push(error);
    }
  }
}
