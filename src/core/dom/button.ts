import { DestroyService } from '../destroy-service';
import type { GuiObjectProperties } from '../gui-object';
import { assertBoolean, assertString } from '../internal/validation';
import { emitNodeEvent } from '../node/events';
import { guiEventKeys, type ButtonEventMethods } from '../node/gui-events';
import type { GuiElement } from '../node/gui-node';

export type ButtonProperties = {
  /** Disables interaction and keyboard activation. */
  Disabled: boolean;
  /** Whether FrameKit applies standard hover and pressed feedback. */
  AutoButtonColor: boolean;
  /** Optional accessible name when visible content is not descriptive enough. */
  AccessibleLabel: string;
};

/** Shared instance shape for text and image buttons. */
export type ButtonElement<
  Properties extends GuiObjectProperties & ButtonProperties = GuiObjectProperties &
    ButtonProperties,
> = GuiElement<Properties> &
  ButtonEventMethods & {
    /** The underlying browser button element. */
    readonly element: HTMLButtonElement;
  };

const documentsWithButtonStyles = new WeakSet<Document>();

export function initializeButtonElement<Properties extends GuiObjectProperties & ButtonProperties>(
  node: ButtonElement<Properties>,
  element: HTMLButtonElement,
): void {
  const listenerController = new AbortController();
  const listenerOptions = { signal: listenerController.signal };
  let secondaryButtonIsDown = false;

  element.type = 'button';
  element.dataset.framekitButton = '';
  Object.assign(element.style, {
    appearance: 'none',
    border: '0',
    margin: '0',
    padding: '0',
    font: 'inherit',
    color: 'inherit',
    cursor: element.disabled ? 'not-allowed' : 'pointer',
  });
  ensureButtonStyles(element.ownerDocument);

  element.addEventListener(
    'click',
    (event) => {
      if (!element.disabled) emitNodeEvent(node, guiEventKeys.click, event);
    },
    listenerOptions,
  );

  element.addEventListener(
    'mousedown',
    (event) => {
      if (element.disabled) return;
      if (event.button === 0) emitNodeEvent(node, guiEventKeys.primaryButtonDown, event);
      if (event.button === 2) {
        secondaryButtonIsDown = true;
        emitNodeEvent(node, guiEventKeys.secondaryButtonDown, event);
      }
    },
    listenerOptions,
  );

  element.addEventListener(
    'mouseup',
    (event) => {
      if (element.disabled) {
        secondaryButtonIsDown = false;
        return;
      }
      if (event.button === 0) emitNodeEvent(node, guiEventKeys.primaryButtonUp, event);
      if (event.button === 2) {
        emitNodeEvent(node, guiEventKeys.secondaryButtonUp, event);
        if (secondaryButtonIsDown) emitNodeEvent(node, guiEventKeys.secondaryClick, event);
        secondaryButtonIsDown = false;
      }
    },
    listenerOptions,
  );

  element.addEventListener(
    'mouseleave',
    () => {
      secondaryButtonIsDown = false;
    },
    listenerOptions,
  );

  DestroyService.onDestroy(node, () => listenerController.abort());
}

/** Synchronizes properties shared by every FrameKit button. */
export function renderButtonProperties(
  element: HTMLButtonElement,
  properties: Readonly<ButtonProperties>,
): void {
  element.disabled = properties.Disabled;
  element.style.cursor = properties.Disabled ? 'not-allowed' : 'pointer';
  element.toggleAttribute('data-framekit-auto-button-color', properties.AutoButtonColor);
  if (properties.AccessibleLabel === '') element.removeAttribute('aria-label');
  else element.setAttribute('aria-label', properties.AccessibleLabel);
}

/** Validates properties shared by every FrameKit button. */
export function validateButtonProperties(properties: Readonly<ButtonProperties>): void {
  assertBoolean(properties.Disabled, 'Disabled');
  assertBoolean(properties.AutoButtonColor, 'AutoButtonColor');
  assertString(properties.AccessibleLabel, 'AccessibleLabel');
}

function ensureButtonStyles(ownerDocument: Document): void {
  if (documentsWithButtonStyles.has(ownerDocument)) return;
  const style = ownerDocument.createElement('style');
  style.dataset.framekitButtonStyles = '';
  style.textContent = `
    [data-framekit-button][data-framekit-auto-button-color] {
      transition: filter 140ms ease;
    }
    [data-framekit-button][data-framekit-auto-button-color]:not(:disabled):hover {
      filter: brightness(1.06);
    }
    [data-framekit-button][data-framekit-auto-button-color]:not(:disabled):active {
      filter: brightness(0.92);
    }
    @media (prefers-reduced-motion: reduce) {
      [data-framekit-button][data-framekit-auto-button-color] {
        transition-duration: 0.001ms;
      }
    }
  `;
  ownerDocument.head.append(style);
  documentsWithButtonStyles.add(ownerDocument);
}
