import { dispatch, subscribe } from '../core/events';
import { cleanup, type GuiNode } from '../core/node';
import type { Unsubscribe } from '../core/signals';
import type { FrameProps } from '../gui/frame-node';

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
  return subscribe<[MouseEvent]>(node, event, listener);
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
        dispatch(node, 'MouseButton1Down', event);
      } else if (event.button === 2) {
        rightDown = true;
        dispatch(node, 'MouseButton2Down', event);
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
        dispatch(node, 'MouseButton1Up', event);
        if (leftDown) dispatch(node, 'MouseButton1Click', event);
        leftDown = false;
      } else if (event.button === 2) {
        dispatch(node, 'MouseButton2Up', event);
        if (rightDown) dispatch(node, 'MouseButton2Click', event);
        rightDown = false;
      }
    },
    options,
  );
  button.addEventListener('mouseenter', (event) => dispatch(node, 'MouseEnter', event), options);
  button.addEventListener(
    'mouseleave',
    (event) => {
      leftDown = false;
      rightDown = false;
      dispatch(node, 'MouseLeave', event);
    },
    options,
  );
  button.addEventListener('contextmenu', (event) => event.preventDefault(), options);
  cleanup(node, () => abortController.abort());
}
