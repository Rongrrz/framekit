import { createFrame, createTextButton, createTextInput, createUserInputService } from 'framekit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetDocumentAfterEach } from '../support/reset-document.js';

resetDocumentAfterEach();
afterEach(() => vi.restoreAllMocks());

const press = (
  target: EventTarget,
  type = 'keydown',
  options: KeyboardEventInit = {},
): KeyboardEvent => {
  const event = new KeyboardEvent(type, {
    key: 'w',
    code: 'KeyW',
    bubbles: true,
    cancelable: true,
    ...options,
  });
  target.dispatchEvent(event);
  return event;
};

describe('owned keyboard input service', () => {
  it('observes document input after local controls and marks handled and text-editing input', () => {
    const owner = createFrame();
    const input = createUserInputService(owner);
    const began = vi.fn();
    input.inputBegan.subscribe(began);
    const button = createTextButton();
    const text = createTextInput();
    document.body.append(button.unsafeElement, text.unsafeElement);

    const unhandled = press(button.unsafeElement);
    expect(began).toHaveBeenLastCalledWith(unhandled, false);
    button.on('keydown', (event) => event.preventDefault());
    const handled = press(button.unsafeElement);
    expect(began).toHaveBeenLastCalledWith(handled, true);
    const editing = press(text.unsafeElement);
    expect(began).toHaveBeenLastCalledWith(editing, true);
    const editable = document.body.appendChild(document.createElement('div'));
    editable.contentEditable = 'true';
    const nested = editable.appendChild(document.createElement('span'));
    const editingChild = press(nested);
    expect(began).toHaveBeenLastCalledWith(editingChild, true);
    owner.destroy();
    button.destroy();
    text.destroy();
  });

  it('tracks physical codes, suppresses repeat and composition, and updates state before signals', () => {
    const owner = createFrame();
    const input = createUserInputService(owner);
    const began = vi.fn(() => expect(input.isKeyDown('KeyW')).toBe(true));
    const ended = vi.fn(() => expect(input.isKeyDown('KeyW')).toBe(false));
    input.inputBegan.subscribe(began);
    input.inputEnded.subscribe(ended);
    press(document, 'keydown', { isComposing: true });
    expect(input.isKeyDown('KeyW')).toBe(false);
    press(document, 'keydown', { key: 'W', shiftKey: true });
    press(document, 'keydown', { repeat: true });
    expect(began).toHaveBeenCalledOnce();
    press(document, 'keyup');
    expect(ended).toHaveBeenCalledOnce();
    press(document);
    press(document, 'keyup', { isComposing: true });
    expect(input.isKeyDown('KeyW')).toBe(false);
    expect(ended).toHaveBeenCalledOnce();
    owner.destroy();
  });

  it('clears held keys when the window loses focus or the document is hidden', () => {
    const owner = createFrame();
    const input = createUserInputService(owner);
    press(document);
    window.dispatchEvent(new Event('blur'));
    expect(input.isKeyDown('KeyW')).toBe(false);
    press(document);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(input.isKeyDown('KeyW')).toBe(false);
    owner.destroy();
  });

  it.each(['dispose', 'destroy'] as const)(
    'releases signals, keys, and browser listeners on %s',
    (action) => {
      const owner = createFrame();
      const input = createUserInputService(owner);
      const began = vi.fn();
      const ended = vi.fn();
      input.inputBegan.subscribe(began);
      input.inputEnded.subscribe(ended);
      press(document);
      expect(input.isKeyDown('KeyW')).toBe(true);
      if (action === 'destroy') {
        owner.destroy();
      } else {
        input.dispose();
      }
      input.dispose();
      expect(input.isKeyDown('KeyW')).toBe(false);
      press(document);
      press(document, 'keyup');
      expect(began).toHaveBeenCalledOnce();
      expect(ended).not.toHaveBeenCalled();
      owner.destroy();
      expect(() => createUserInputService(owner)).toThrow(/destroyed/);
    },
  );

  it('uses the owner’s document and supports independent subscription disposal', () => {
    const iframe = document.body.appendChild(document.createElement('iframe'));
    const otherDocument = iframe.contentDocument!;
    const owner = createFrame({}, { ownerDocument: otherDocument });
    const input = createUserInputService(owner);
    const listener = vi.fn();
    const stop = input.inputBegan.subscribe(listener);
    press(document);
    expect(listener).not.toHaveBeenCalled();
    press(otherDocument);
    expect(listener).toHaveBeenCalledOnce();
    stop();
    stop();
    press(otherDocument);
    expect(listener).toHaveBeenCalledOnce();
    owner.destroy();
  });
});
