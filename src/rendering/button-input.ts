import { dispatchNodeEvent, subscribeNodeEvent } from '../core/event/node-event';
import type { Unsubscribe } from '../core/event/signal';
import { cleanup } from '../core/node/lifecycle';
import type { GuiNode } from '../core/node/variants/gui';
import type { FrameProps } from '../gui/frame';

export type ButtonProps = {
  Disabled: boolean;
};

/** Event names supported by text and image buttons. */
export type ButtonEvent =
  | 'MouseButton1Click'
  | 'MouseButton1Down'
  | 'MouseButton1Up'
  | 'MouseButton2Click'
  | 'MouseButton2Down'
  | 'MouseButton2Up'
  | 'MouseEnter'
  | 'MouseLeave';

export type ButtonNode = GuiNode<FrameProps & ButtonProps> & {
  readonly element: HTMLButtonElement;
};

/** Subscribes to a typed button event and returns an idempotent unsubscribe function. */
export function on(
  node: ButtonNode,
  event: ButtonEvent,
  listener: (event: MouseEvent) => void,
): Unsubscribe {
  return subscribeNodeEvent<[MouseEvent]>(node, event, listener);
}

export function attachButtonBehavior(node: ButtonNode, button: HTMLButtonElement): void {
  const abortController = new AbortController();
  const options = { signal: abortController.signal };
  let leftDown = false;
  let rightDown = false;

  button.type = 'button';
  Object.assign(button.style, { padding: '0', cursor: 'pointer' });
  button.addEventListener(
    'mousedown',
    (event) => {
      if (button.disabled) return;
      if (event.button === 0) {
        leftDown = true;
        dispatchNodeEvent(node, 'MouseButton1Down', event);
      } else if (event.button === 2) {
        rightDown = true;
        dispatchNodeEvent(node, 'MouseButton2Down', event);
      }
    },
    options,
  );
  button.addEventListener(
    'mouseup',
    (event) => {
      if (button.disabled) {
        leftDown = false;
        rightDown = false;
        return;
      }
      if (event.button === 0) {
        dispatchNodeEvent(node, 'MouseButton1Up', event);
        if (leftDown) dispatchNodeEvent(node, 'MouseButton1Click', event);
        leftDown = false;
      } else if (event.button === 2) {
        dispatchNodeEvent(node, 'MouseButton2Up', event);
        if (rightDown) dispatchNodeEvent(node, 'MouseButton2Click', event);
        rightDown = false;
      }
    },
    options,
  );
  button.addEventListener(
    'mouseenter',
    (event) => dispatchNodeEvent(node, 'MouseEnter', event),
    options,
  );
  button.addEventListener(
    'mouseleave',
    (event) => {
      leftDown = false;
      rightDown = false;
      dispatchNodeEvent(node, 'MouseLeave', event);
    },
    options,
  );
  button.addEventListener('contextmenu', (event) => event.preventDefault(), options);
  cleanup(node, () => abortController.abort());
}
