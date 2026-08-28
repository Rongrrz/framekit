import { guiEventKeys, type ButtonEventMethods } from '../runtime/gui-events';
import { addCleanup } from '../runtime/node';
import type { GuiNode } from '../runtime/render';
import { emitNodeEvent } from '../runtime/signal';
import type { FrameProps } from './frame';

export type ButtonProps = {
  Disabled: boolean;
};

export type ButtonNode = GuiNode<FrameProps & ButtonProps> &
  ButtonEventMethods & {
    readonly element: HTMLButtonElement;
  };

export function initializeButtonElement(node: ButtonNode, element: HTMLButtonElement): void {
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
