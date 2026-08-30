import { describe, expect, it, vi } from 'vitest';

import { fk } from '../../..';
import { resetDocumentAfterEach } from '../../support/reset-document';

const { createImageButton, createTextButton } = fk;
resetDocumentAfterEach();

describe('buttons', () => {
  it('uses a semantic button, typed events, and lifecycle cleanup', () => {
    const button = createTextButton();
    const callback = vi.fn();
    const unsubscribe = button.onClick(callback);

    expect(button.element.tagName).toBe('BUTTON');
    expect(button.element.style.appearance).toBe('none');
    expect(button.element.style.border).toBe('0px');
    expect(button.element.style.margin).toBe('0px');
    expect(button.element.style.padding).toBe('0px');
    expect(button.element.style.font).toBe('inherit');
    expect(button.element.style.color).toBe('inherit');
    expect(button.element.style.outline).toBe('');
    expect(button.element.style.cursor).toBe('pointer');
    expect('onTextChanged' in button).toBe(false);

    button.element.click();

    expect(callback).toHaveBeenCalledOnce();

    unsubscribe();
    button.element.click();

    expect(callback).toHaveBeenCalledOnce();

    button.destroy();

    expect(() => button.onClick(callback)).toThrow(/destroyed/);
  });

  it('does not fire button press events while disabled', () => {
    const button = createTextButton({ Disabled: true });
    const callback = vi.fn();

    button.onClick(callback);
    button.element.click();

    expect(callback).not.toHaveBeenCalled();
    expect(button.element.style.cursor).toBe('not-allowed');

    button.setProperties({ Disabled: false });

    expect(button.element.style.cursor).toBe('pointer');
  });

  it('exposes primary and secondary button events as discoverable methods', () => {
    const button = createTextButton();
    const primaryDown = vi.fn();
    const primaryUp = vi.fn();
    const secondaryDown = vi.fn();
    const secondaryUp = vi.fn();
    const secondaryClick = vi.fn();

    button.onPrimaryButtonDown(primaryDown);
    button.onPrimaryButtonUp(primaryUp);
    button.onSecondaryButtonDown(secondaryDown);
    button.onSecondaryButtonUp(secondaryUp);
    button.onSecondaryClick(secondaryClick);
    button.element.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    button.element.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    button.element.dispatchEvent(new MouseEvent('mousedown', { button: 2 }));
    button.element.dispatchEvent(new MouseEvent('mouseup', { button: 2 }));

    expect(primaryDown).toHaveBeenCalledOnce();
    expect(primaryUp).toHaveBeenCalledOnce();
    expect(secondaryDown).toHaveBeenCalledOnce();
    expect(secondaryUp).toHaveBeenCalledOnce();
    expect(secondaryClick).toHaveBeenCalledOnce();
  });

  it('uses semantic image buttons and synchronizes their disabled state', () => {
    const button = createImageButton({ Disabled: true });

    expect(button.element.tagName).toBe('BUTTON');
    expect(button.element.disabled).toBe(true);
    expect(button.element.style.cursor).toBe('not-allowed');

    button.setProperties({ Disabled: false });

    expect(button.element.disabled).toBe(false);
    expect(button.element.style.cursor).toBe('pointer');
  });
});
