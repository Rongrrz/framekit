import { bindCheckbox, createObservableValue, createTextButton } from 'framekit';
import { expect, it } from 'vitest';

import { destroyNodesAfterEach } from '../support/node-cleanup.js';

const own = destroyNodesAfterEach();

it('toggles caller state once, reflects programmatic changes, and respects Disabled', () => {
  const button = own(createTextButton({ Text: 'Enable shadows' }));
  const checked = createObservableValue(false);
  bindCheckbox(button, checked);
  expect(button.ClassName).toBe('TextButton');
  expect(button.unsafeElement.getAttribute('aria-checked')).toBe('false');
  button.unsafeElement.click();
  expect(checked.get()).toBe(true);
  checked.set(false);
  expect(button.unsafeElement.getAttribute('aria-checked')).toBe('false');
  button.Disabled = true;
  button.unsafeElement.dispatchEvent(new MouseEvent('click'));
  expect(checked.get()).toBe(false);
  expect(button.unsafeElement.getAttribute('aria-disabled')).toBe('true');
});

it('restores semantics and releases subscriptions without destroying caller content', () => {
  const button = own(createTextButton());
  button.unsafeElement.setAttribute('role', 'switch');
  button.unsafeElement.setAttribute('aria-checked', 'true');
  const checked = createObservableValue(false);
  const dispose = bindCheckbox(button, checked);
  dispose();
  dispose();
  checked.set(true);
  checked.set(false);
  button.unsafeElement.click();
  expect(checked.get()).toBe(false);
  expect(button.unsafeElement.getAttribute('role')).toBe('switch');
  expect(button.unsafeElement.getAttribute('aria-checked')).toBe('true');
  expect(button.isDestroyed()).toBe(false);
  bindCheckbox(button, checked);
  button.destroy();
  checked.set(true);
  expect(button.unsafeElement.getAttribute('role')).toBe('switch');
});
