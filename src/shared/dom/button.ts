import type { GuiObjectProperties } from '../../core/gui-object';
import { guiEventKeys, type ButtonEventMethods } from '../runtime/gui-events';
import { addCleanup } from '../runtime/node-lifecycle';
import type { GuiElement } from '../runtime/render';
import { emitNodeEvent } from '../runtime/signal';
import { assertBoolean, assertString } from '../runtime/validation';

export type ButtonProperties = {
  /** Disables interaction and keyboard activation. */
  Disabled: boolean;
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

export function initializeButtonElement<Properties extends GuiObjectProperties & ButtonProperties>(
  node: ButtonElement<Properties>,
  element: HTMLButtonElement,
): void {
  const listenerController = new AbortController();
  const listenerOptions = { signal: listenerController.signal };
  let secondaryButtonIsDown = false;

  element.type = 'button';
  Object.assign(element.style, {
    appearance: 'none',
    border: '0',
    margin: '0',
    padding: '0',
    font: 'inherit',
    color: 'inherit',
    cursor: element.disabled ? 'not-allowed' : 'pointer',
  });

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

  element.addEventListener('contextmenu', (event) => event.preventDefault(), listenerOptions);

  addCleanup(node, () => listenerController.abort());
}

/** Synchronizes properties shared by every FrameKit button. */
export function renderButtonProperties(
  element: HTMLButtonElement,
  properties: Readonly<ButtonProperties>,
): void {
  element.disabled = properties.Disabled;
  element.style.cursor = properties.Disabled ? 'not-allowed' : 'pointer';
  if (properties.AccessibleLabel === '') element.removeAttribute('aria-label');
  else element.setAttribute('aria-label', properties.AccessibleLabel);
}

/** Validates properties shared by every FrameKit button. */
export function validateButtonProperties(properties: Readonly<ButtonProperties>): void {
  assertBoolean(properties.Disabled, 'Disabled');
  assertString(properties.AccessibleLabel, 'AccessibleLabel');
}
