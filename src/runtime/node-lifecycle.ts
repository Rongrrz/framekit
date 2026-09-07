import { throwCollectedErrors } from './errors';
import type { GuiElement } from './gui-node';
import type { Instance } from './node';
import { getActiveNodeState, getChildren, getNodeState, isModifierState } from './node-state';
import { hasLayoutModifier, renderNode } from './render';
import { unlinkNodeFromParent } from './tree';

/** Recursively destroys a node, its descendants, DOM, and owned resources. */
export function destroy(node: Instance): void {
  const errors: unknown[] = [];
  destroyRecursively(node, errors);
  throwCollectedErrors(errors, 'Multiple errors occurred while destroying a node.');
}

export function isDestroyed(node: Instance): boolean {
  return getNodeState(node).destroyed;
}

/** Registers a resource to release when the node is destroyed. */
export function onDestroy(node: Instance, callback: () => void): () => void {
  const cleanups = getActiveNodeState(node).cleanups;
  cleanups.add(callback);
  return () => cleanups.delete(callback);
}

function destroyRecursively(
  node: Instance,
  errors: unknown[],
  ancestorElementBeingRemoved?: HTMLElement,
): void {
  const state = getNodeState(node);
  if (state.destroyed) return;

  const children = getChildren(state);
  const subtreeElementBeingRemoved =
    ancestorElementBeingRemoved ??
    (state.kind === 'gui' ? (node as GuiElement).element : undefined);
  for (const child of children) {
    // The whole subtree is leaving, so child teardown must not rerender its parent.
    getNodeState(child).parent = undefined;
    destroyRecursively(child, errors, subtreeElementBeingRemoved);
  }
  children.length = 0;

  if (state.parent) {
    const previousParent = unlinkNodeFromParent(node, state)!;
    if (isModifierState(state) || hasLayoutModifier(previousParent)) {
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
