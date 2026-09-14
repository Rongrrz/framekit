import type { GuiElement, LayoutModifier, StyleModifier } from '../core';
import { assertBoolean } from '../core/internal-api';

type Modifier = StyleModifier | LayoutModifier;

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
