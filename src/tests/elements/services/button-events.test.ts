import { createFrame, createImageButton, createTextButton } from 'framekit';
import { describe, expect, it, vi } from 'vitest';

import { resetDocumentAfterEach } from '../../support/reset-document.js';

resetDocumentAfterEach();

describe('buttons', () => {
  it('uses a semantic button, typed events, and lifecycle cleanup', () => {
    const button = createTextButton();
    const callback = vi.fn();
    const unsubscribe = button.onClick(callback);

    expect(button.unsafeElement.tagName).toBe('BUTTON');
    expect(button.unsafeElement.style.appearance).toBe('none');
    expect(button.unsafeElement.style.border).toBe('0px');
    expect(button.unsafeElement.style.margin).toBe('0px');
    expect(button.unsafeElement.style.padding).toBe('0px');
    expect(button.unsafeElement.style.font).toBe('inherit');
    expect(button.unsafeElement.style.color).toBe('inherit');
    expect(button.unsafeElement.style.outline).toBe('');
    expect(button.unsafeElement.style.cursor).toBe('pointer');
    expect(button.AutoButtonColor).toBe(true);
    expect(button.unsafeElement.hasAttribute('data-framekit-auto-button-color')).toBe(true);
    expect(document.querySelector('[data-framekit-styles]')?.textContent).toContain(
      '[data-framekit-button][data-framekit-auto-button-color]:not(:disabled):hover',
    );
    expect('onTextChanged' in button).toBe(false);

    button.unsafeElement.click();

    expect(callback).toHaveBeenCalledOnce();

    unsubscribe();
    button.unsafeElement.click();

    expect(callback).toHaveBeenCalledOnce();

    button.destroy();

    expect(() => button.onClick(callback)).toThrow(/destroyed/);
  });

  it('allows automatic hover and pressed feedback to be disabled', () => {
    const button = createTextButton({ AutoButtonColor: false });

    expect(button.unsafeElement.hasAttribute('data-framekit-auto-button-color')).toBe(false);

    button.AutoButtonColor = true;

    expect(button.unsafeElement.hasAttribute('data-framekit-auto-button-color')).toBe(true);
    expect(() => button.setProperties({ AutoButtonColor: 'yes' as never })).toThrow(
      /AutoButtonColor/,
    );
  });

  it.each([
    ['text', createTextButton],
    ['image', createImageButton],
  ] as const)('suppresses all %s button press events while disabled', (_, createButton) => {
    const button = createButton({ Disabled: true });
    const callback = vi.fn();
    expect(button.unsafeElement.tagName).toBe('BUTTON');
    expect(button.unsafeElement.type).toBe('button');
    expect(button.unsafeElement.disabled).toBe(true);
    expect(button.AutoButtonColor).toBe(true);

    button.onClick(callback);
    button.onPrimaryButtonDown(callback);
    button.onPrimaryButtonUp(callback);
    button.onSecondaryButtonDown(callback);
    button.onSecondaryButtonUp(callback);
    button.onSecondaryClick(callback);
    for (const [type, mouseButton] of [
      ['click', 0],
      ['mousedown', 0],
      ['mouseup', 0],
      ['mousedown', 2],
      ['mouseup', 2],
    ] as const) {
      button.unsafeElement.dispatchEvent(new MouseEvent(type, { button: mouseButton }));
    }

    expect(callback).not.toHaveBeenCalled();
    expect(button.unsafeElement.style.cursor).toBe('not-allowed');

    button.setProperties({ Disabled: false });

    expect(button.unsafeElement.disabled).toBe(false);
    expect(button.unsafeElement.style.cursor).toBe('pointer');
    button.unsafeElement.click();
    expect(callback).toHaveBeenCalledOnce();
    button.destroy();
    button.unsafeElement.dispatchEvent(new MouseEvent('click'));
    button.unsafeElement.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    expect(callback).toHaveBeenCalledOnce();
  });

  it('keeps its accessible label synchronized through a typed property', () => {
    const button = createTextButton({ AccessibleLabel: 'Open settings' });

    expect(button.unsafeElement.getAttribute('aria-label')).toBe('Open settings');

    button.AccessibleLabel = 'Close settings';

    expect(button.unsafeElement.getAttribute('aria-label')).toBe('Close settings');

    button.AccessibleLabel = '';

    expect(button.unsafeElement.hasAttribute('aria-label')).toBe(false);
    expect(() => button.setProperties({ AccessibleLabel: 42 as never })).toThrow(/AccessibleLabel/);
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
    button.unsafeElement.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    button.unsafeElement.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    button.unsafeElement.dispatchEvent(new MouseEvent('mousedown', { button: 2 }));
    button.unsafeElement.dispatchEvent(new MouseEvent('mouseup', { button: 2 }));

    expect(primaryDown).toHaveBeenCalledOnce();
    expect(primaryUp).toHaveBeenCalledOnce();
    expect(secondaryDown).toHaveBeenCalledOnce();
    expect(secondaryUp).toHaveBeenCalledOnce();
    expect(secondaryClick).toHaveBeenCalledOnce();
  });

  it('preserves native context menus and rejects nested GUI children', () => {
    const textButton = createTextButton();
    const imageButton = createImageButton();
    const contextMenu = new MouseEvent('contextmenu', { cancelable: true });

    textButton.unsafeElement.dispatchEvent(contextMenu);

    expect(contextMenu.defaultPrevented).toBe(false);
    expect(() => (createFrame().Parent = textButton)).toThrow(/cannot contain GUI children/);
    expect(() => (createFrame().Parent = imageButton)).toThrow(/cannot contain GUI children/);
  });

  it('only emits a secondary click for a press and release without leaving the button', () => {
    const button = createTextButton();
    const clicked = vi.fn();
    button.onSecondaryClick(clicked);
    button.unsafeElement.dispatchEvent(new MouseEvent('mouseup', { button: 2 }));
    expect(clicked).not.toHaveBeenCalled();
    button.unsafeElement.dispatchEvent(new MouseEvent('mousedown', { button: 2 }));
    button.unsafeElement.dispatchEvent(new MouseEvent('mouseleave'));
    button.unsafeElement.dispatchEvent(new MouseEvent('mouseup', { button: 2 }));
    expect(clicked).not.toHaveBeenCalled();
    button.unsafeElement.dispatchEvent(new MouseEvent('mousedown', { button: 2 }));
    button.unsafeElement.dispatchEvent(new MouseEvent('mouseup', { button: 2 }));
    button.unsafeElement.dispatchEvent(new MouseEvent('mouseup', { button: 2 }));
    expect(clicked).toHaveBeenCalledOnce();
    button.destroy();
  });
});
