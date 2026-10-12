import { createFrame, createTextButton, createTextInput } from 'framekit';
import { expect, it, vi } from 'vitest';

it('owns native keyboard listeners and supports repeated early disposal', () => {
  const node = createFrame();
  const listener = vi.fn((event: KeyboardEvent) => event.preventDefault());
  const dispose = node.on('keydown', listener);
  const event = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
  node.unsafeElement.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  dispose();
  dispose();
  node.unsafeElement.dispatchEvent(new KeyboardEvent('keydown'));
  expect(listener).toHaveBeenCalledOnce();
  node.on('keydown', listener);
  node.destroy();
  node.unsafeElement.dispatchEvent(new KeyboardEvent('keydown'));
  expect(listener).toHaveBeenCalledOnce();
  expect(() => node.on('keydown', listener)).toThrow(/destroyed/);
});

it('runs once listeners once even for nested dispatch', () => {
  const node = createTextButton();
  const listener = vi.fn(() => node.unsafeElement.click());
  node.on('click', listener, { once: true });
  node.unsafeElement.click();
  expect(listener).toHaveBeenCalledOnce();
  node.destroy();
});

it('delivers input events after the native text property has synchronized', () => {
  const input = createTextInput();
  const seen: string[] = [];
  input.on('input', () => seen.push(input.Text));
  input.unsafeElement.value = 'edited';
  input.unsafeElement.dispatchEvent(new Event('input'));
  expect(seen).toEqual(['edited']);
  input.destroy();
});

it('uses native focus and rejects operations after destruction', () => {
  const button = createTextButton();
  document.body.append(button.unsafeElement);
  button.focus();
  expect(document.activeElement).toBe(button.unsafeElement);
  button.blur();
  expect(document.activeElement).not.toBe(button.unsafeElement);
  button.destroy();
  expect(() => button.focus()).toThrow(/destroyed/);
  expect(() => button.setPointerCapture(1)).toThrow(/destroyed/);
});

it('snapshots listener options so later caller mutation cannot prevent cleanup', () => {
  const node = createFrame();
  const options = { capture: true, once: false };
  const listener = vi.fn();
  node.on('click', listener, options);
  options.capture = false;
  options.once = true;
  node.unsafeElement.click();
  node.unsafeElement.click();
  expect(listener).toHaveBeenCalledTimes(2);
  node.destroy();
  node.unsafeElement.click();
  expect(listener).toHaveBeenCalledTimes(2);
});
