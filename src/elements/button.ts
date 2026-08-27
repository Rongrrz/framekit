import { addCleanup } from '../runtime/node';
import type { GuiNode } from '../runtime/render';
import { emitNodeEvent, onNodeEvent, type Unsubscribe } from '../runtime/signal';
import type { FrameProps } from './frame';
import type { GuiEvent } from './gui-input';
import type { TextBoxEvent, TextBoxNode } from './text-box';

export type ButtonProps = {
  Disabled: boolean;
};

export type ButtonEvent = GuiEvent | ButtonPressEvent;

export type ButtonPressEvent =
  | 'MouseButton1Click'
  | 'MouseButton1Down'
  | 'MouseButton1Up'
  | 'MouseButton2Click'
  | 'MouseButton2Down'
  | 'MouseButton2Up';

export type ButtonNode = GuiNode<FrameProps & ButtonProps> & {
  readonly element: HTMLButtonElement;
};

const buttonEvents = new Set<ButtonEvent>([
  'MouseButton1Click',
  'MouseButton1Down',
  'MouseButton1Up',
  'MouseButton2Click',
  'MouseButton2Down',
  'MouseButton2Up',
  'MouseEnter',
  'MouseLeave',
]);

const textBoxEvents = new Set<TextBoxEvent>(['TextChanged']);

/** Subscribes to a typed GUI input event and returns an idempotent unsubscribe function. */
export function on(
  node: GuiNode,
  event: GuiEvent,
  listener: (event: MouseEvent) => void,
): Unsubscribe;
export function on(
  node: ButtonNode,
  event: ButtonEvent,
  listener: (event: MouseEvent) => void,
): Unsubscribe;
export function on(
  node: TextBoxNode,
  event: TextBoxEvent,
  listener: (text: string, event: InputEvent) => void,
): Unsubscribe;
export function on<Arguments extends unknown[]>(
  node: GuiNode,
  event: ButtonEvent | TextBoxEvent,
  listener: (...args: Arguments) => void,
): Unsubscribe {
  if (!buttonEvents.has(event as ButtonEvent) && !textBoxEvents.has(event as TextBoxEvent)) {
    throw new TypeError(`Unsupported GUI event "${event}".`);
  }
  return onNodeEvent(node, event, listener);
}

export function configureButton(node: ButtonNode, element: HTMLButtonElement): void {
  const controller = new AbortController();
  const listenerOptions = { signal: controller.signal };
  let rightButtonDown = false;

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
      if (!element.disabled) emitNodeEvent(node, 'MouseButton1Click', event);
    },
    listenerOptions,
  );
  element.addEventListener(
    'mousedown',
    (event) => {
      if (element.disabled) return;
      if (event.button === 0) emitNodeEvent(node, 'MouseButton1Down', event);
      if (event.button === 2) {
        rightButtonDown = true;
        emitNodeEvent(node, 'MouseButton2Down', event);
      }
    },
    listenerOptions,
  );
  element.addEventListener(
    'mouseup',
    (event) => {
      if (element.disabled) {
        rightButtonDown = false;
        return;
      }
      if (event.button === 0) emitNodeEvent(node, 'MouseButton1Up', event);
      if (event.button === 2) {
        emitNodeEvent(node, 'MouseButton2Up', event);
        if (rightButtonDown) emitNodeEvent(node, 'MouseButton2Click', event);
        rightButtonDown = false;
      }
    },
    listenerOptions,
  );
  element.addEventListener('mouseleave', () => (rightButtonDown = false), listenerOptions);
  element.addEventListener('contextmenu', (event) => event.preventDefault(), listenerOptions);
  addCleanup(node, () => controller.abort());
}
