import type { GuiElement } from '../../node/gui-node.js';
import type { Instance } from '../../node/instance.js';
import { getChildren, isGuiNode, type NodeState } from '../../node/registry.js';

/** Places a GUI child at the DOM position represented by the authoritative hierarchy. */
export const placeChildElement = (
  parent: Instance,
  parentState: NodeState,
  child: Instance,
  childIndex: number,
): void => {
  if (
    !isGuiNode(child) ||
    !isGuiNode(parent) ||
    child.unsafeElement.parentElement === parent.unsafeElement
  ) {
    return;
  }
  const siblings = getChildren(parentState);
  let nextGuiSibling: GuiElement | undefined;
  for (let index = childIndex + 1; index < siblings.length; index += 1) {
    const sibling = siblings[index]!;
    if (!isGuiNode(sibling)) {
      continue;
    }
    nextGuiSibling = sibling;
    break;
  }
  parent.unsafeElement.insertBefore(child.unsafeElement, nextGuiSibling?.unsafeElement ?? null);
};
