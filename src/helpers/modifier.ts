import type { GuiElement } from '../node/gui-node';
import type { Modifier } from '../node/modifier';
import { assertBoolean } from '../runtime/validation';

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
