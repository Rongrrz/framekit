import type { LayoutNode, StyleModifierNode } from '../shared/runtime/modifier';
import type { NodeProperties } from '../shared/runtime/node';
import type { GuiNode } from '../shared/runtime/render';
import { assertBoolean } from '../shared/runtime/validation';

type ModifierNode<Properties extends NodeProperties = NodeProperties> =
  | LayoutNode<Properties>
  | StyleModifierNode<Properties>;

/** Attaches or detaches a retained modifier without recreating it. */
export function setModifierAttached(
  parent: GuiNode,
  modifier: ModifierNode,
  attached: boolean,
): void {
  assertBoolean(attached, 'Attached');
  if (attached) {
    if (modifier.Parent !== parent) modifier.Parent = parent;
    return;
  }

  if (modifier.Parent === parent) modifier.Parent = undefined;
}
