import { throwCollectedErrors } from '#internal/errors.js';

import type { GuiElement } from '../node/gui-node.js';
import type { Instance } from '../node/instance.js';
import { getActiveNodeState, getChildren, getNodeState } from '../node/registry.js';
import { unlinkNodeFromParent } from './hierarchy/mutation.js';
import * as rendering from './rendering.js';

/** Recursively destroys a node, its descendants, DOM, and owned resources. */
export function destroy(node: Instance): void {
  const state = getNodeState(node);

  if (state.destroyed) {
    return;
  }

  const rootElement = state.kind === 'gui' ? (node as GuiElement).unsafeElement : undefined;
  const previousParent = unlinkNodeFromParent(node, state);
  const pending = [node];
  const subtree: Instance[] = [];

  // Close ownership before calling any user cleanup. Reentrant destruction is then a no-op,
  // and callbacks cannot rescue descendants or attach new resources to the dying tree.
  while (pending.length > 0) {
    const current = pending.pop()!;
    const currentState = getNodeState(current);
    currentState.destroyed = true;
    currentState.parent = undefined;
    subtree.push(current);

    const children = getChildren(currentState);

    for (const child of children) {
      pending.push(child);
    }

    children.length = 0;

    if (currentState.kind === 'gui') {
      currentState.modifiers.clear();
    }

    rendering.releaseLayout(current);
  }

  const errors: unknown[] = [];

  if (previousParent) {
    try {
      rendering.renderRemovedChild(previousParent, node);
    } catch (error) {
      errors.push(error);
    }
  }

  // Reversing the right-to-left traversal preserves child-before-parent cleanup in tree order.
  for (let index = subtree.length - 1; index >= 0; index -= 1) {
    const current = subtree[index]!;
    const currentState = getNodeState(current);

    for (const callback of currentState.cleanups) {
      try {
        callback();
      } catch (error) {
        errors.push(error);
      }
    }

    currentState.cleanups.clear();

    if (currentState.kind === 'gui') {
      try {
        const element = (current as GuiElement).unsafeElement;

        if (element === rootElement || !rootElement?.contains(element)) {
          element.remove();
        }
      } catch (error) {
        errors.push(error);
      }
    }
  }

  throwCollectedErrors(errors, 'Multiple errors occurred while destroying a node.');
}

export function isDestroyed(node: Instance): boolean {
  return getNodeState(node).destroyed;
}

/** Registers a resource to release when the node is destroyed. */
export function onDestroy(node: Instance, callback: () => void): () => void {
  const cleanups = getActiveNodeState(node).cleanups;
  const cleanup = (): void => callback();
  cleanups.add(cleanup);

  return () => {
    cleanups.delete(cleanup);
  };
}
