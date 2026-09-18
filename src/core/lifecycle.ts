import * as hierarchy from './hierarchy';
import { throwCollectedErrors } from './internal/errors';
import type { GuiElement } from './node/gui-node';
import type { Instance } from './node/instance';
import { getActiveNodeState, getChildren, getNodeState, isModifierState } from './node/state';
import * as rendering from './render';

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
    (state.kind === 'gui' ? (node as GuiElement).unsafeElement : undefined);
  for (const child of children) {
    // The whole subtree is leaving, so child teardown must not rerender its parent.
    getNodeState(child).parent = undefined;
    destroyRecursively(child, errors, subtreeElementBeingRemoved);
  }
  children.length = 0;

  if (state.parent) {
    const previousParent = hierarchy.unlinkNodeFromParent(node, state)!;
    if (isModifierState(state) || rendering.hasLayoutModifier(previousParent)) {
      try {
        rendering.renderDerivedStyles(previousParent);
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
      const element = (node as GuiElement).unsafeElement;
      if (!ancestorElementBeingRemoved?.contains(element)) element.remove();
    } catch (error) {
      errors.push(error);
    }
  }
}
