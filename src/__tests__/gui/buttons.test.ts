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
    expect(button.element.style.appearance).toBe('none');
    expect(button.element.style.border).toBe('0px');
    expect(button.element.style.margin).toBe('0px');
    expect(button.element.style.padding).toBe('0px');
    expect(button.element.style.font).toBe('inherit');
    expect(button.element.style.color).toBe('inherit');
    expect(button.element.style.outline).toBe('');
    expect(button.element.style.cursor).toBe('pointer');
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
    expect(button.element.style.cursor).toBe('not-allowed');
    update(button, { Disabled: false });
    expect(button.element.style.cursor).toBe('pointer');
  });

  it('uses semantic image buttons and synchronizes their disabled state', () => {
    const button = createImageButton({ Disabled: true });
    expect(button.element.tagName).toBe('BUTTON');
    expect(button.element.disabled).toBe(true);
    expect(button.element.style.cursor).toBe('not-allowed');
    update(button, { Disabled: false });
    expect(button.element.disabled).toBe(false);
    expect(button.element.style.cursor).toBe('pointer');
  });
});
