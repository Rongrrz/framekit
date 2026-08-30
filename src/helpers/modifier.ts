import type { LayoutModifier, StyleModifier } from '../shared/runtime/modifier';
import type { InstanceProperties } from '../shared/runtime/node';
import type { GuiElement } from '../shared/runtime/render';
import { assertBoolean } from '../shared/runtime/validation';

type Modifier<Properties extends InstanceProperties = InstanceProperties> =
  | LayoutModifier<Properties>
  | StyleModifier<Properties>;

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
