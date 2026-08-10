import { describe, expect, it, vi } from 'vitest';

import { createImageButton, createTextButton, destroy, on, update } from '../..';
import { resetDocumentAfterEach } from '../helpers/reset-document';

resetDocumentAfterEach();

describe('buttons', () => {
  it('uses a semantic button, typed events, and lifecycle cleanup', () => {
    const button = createTextButton();
    const callback = vi.fn();
    const unsubscribe = on(button, 'MouseButton1Click', callback);
    expect(button.element.tagName).toBe('BUTTON');
    button.element.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    button.element.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    expect(callback).toHaveBeenCalledOnce();
    button.element.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    button.element.dispatchEvent(new MouseEvent('mouseleave'));
    button.element.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    expect(callback).toHaveBeenCalledOnce();
    unsubscribe();
    button.element.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    button.element.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    expect(callback).toHaveBeenCalledOnce();
    destroy(button);
    expect(() => on(button, 'MouseButton1Click', callback)).toThrow(/destroyed/);
  });

  it('does not fire button press events while disabled', () => {
    const button = createTextButton({ Disabled: true });
    const callback = vi.fn();
    on(button, 'MouseButton1Click', callback);
    button.element.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    button.element.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    expect(callback).not.toHaveBeenCalled();
  });

  it('uses semantic image buttons and synchronizes their disabled state', () => {
    const button = createImageButton({ Disabled: true });
    expect(button.element.tagName).toBe('BUTTON');
    expect(button.element.disabled).toBe(true);
    update(button, { Disabled: false });
    expect(button.element.disabled).toBe(false);
  });
});
