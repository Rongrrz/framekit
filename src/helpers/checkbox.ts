import type { ButtonElement } from '#elements/button-events.js';
import { preserveAttributes } from '#internal/dom/attributes.js';
import { assertBoolean } from '#internal/validation.js';
import type { Unsubscribe } from '#state/signal.js';
import type { ObservableValue } from '#state/value.js';

import { watchOwnedValue } from './owned-value.js';

/**
 * Adds checkbox semantics to an existing text or image button. Native button activation toggles
 * caller-owned state; appearance remains caller-owned. Disposal restores semantics, keeping the button.
 */
export const bindCheckbox = (
  button: ButtonElement,
  checked: ObservableValue<boolean>,
): Unsubscribe => {
  if (button.isDestroyed()) {
    throw new Error('Checkbox binding requires a live button.');
  }

  assertBoolean(checked.get(), 'Checked value');

  const element = button.unsafeElement;
  const restore = preserveAttributes(element, ['role', 'aria-checked', 'aria-disabled']);
  let disposed = false;
  const stops: Unsubscribe[] = [];

  const dispose = (): void => {
    if (disposed) {
      return;
    }

    disposed = true;
    stops.forEach((stop) => stop());
    restore();
  };

  element.setAttribute('role', 'checkbox');

  const updateDisabled = (): void => {
    element.setAttribute('aria-disabled', String(button.Disabled));
  };

  stops.push(
    button.onDestroy(dispose),
    button.onPropertyChanged('Disabled', updateDisabled),
    button.on('click', (event) => {
      if (!event.defaultPrevented && !button.Disabled) {
        checked.update((value) => !value);
      }
    }),
  );

  updateDisabled();
  stops.push(
    watchOwnedValue(button, checked, (value) => {
      assertBoolean(value, 'Checked value');
      element.setAttribute('aria-checked', String(value));
    }),
  );

  return dispose;
};
