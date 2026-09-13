import { assertBoolean } from '../core/internal/validation';
import type { GuiElement } from '../core/node-service/gui-node';
import type { Modifier } from '../core/node-service/modifier';

/** Attaches or detaches a retained modifier without recreating it. */
export function setModifierAttached(
  parent: GuiElement,
  modifier: Modifier,
  attached: boolean,
): void {
  assertBoolean(attached, 'Attached');
  if (attached) {
    if (modifier.Parent !== parent) modifier.Parent = parent;
    return;
  }

  if (modifier.Parent === parent) modifier.Parent = undefined;
}
