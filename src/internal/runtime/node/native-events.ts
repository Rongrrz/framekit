import type { Unsubscribe } from '#state/signal.js';

import type { GuiElement } from './gui-node.js';
import { getActiveNodeState } from './registry.js';

/** Browser listener options; the node owns the listener's lifetime. */
export type GuiEventOptions = Readonly<
  Pick<AddEventListenerOptions, 'capture' | 'passive' | 'once'>
>;

/** Typed browser input and focus operations shared by DOM-backed nodes. */
export type NativeGuiMethods = {
  /**
   * Subscribes to a native event until disposed or destroyed. Keyboard events arrive through
   * focus and DOM bubbling; hovering does not direct keyboard input to this node.
   */
  on<EventName extends keyof HTMLElementEventMap>(
    eventName: EventName,
    listener: (event: HTMLElementEventMap[EventName]) => void,
    options?: GuiEventOptions,
  ): Unsubscribe;
  /** Focuses this node using native browser rules. */
  focus(options?: FocusOptions): void;
  /** Removes native focus from this node. */
  blur(): void;
  /** Keeps subsequent events for an active pointer on this node. */
  setPointerCapture(pointerId: number): void;
  /** Releases capture for an active pointer. */
  releasePointerCapture(pointerId: number): void;
};

export const nativeGuiMethods = Object.freeze({
  on<EventName extends keyof HTMLElementEventMap>(
    this: GuiElement,
    eventName: EventName,
    listener: (event: HTMLElementEventMap[EventName]) => void,
    options: GuiEventOptions = {},
  ): Unsubscribe {
    const state = getActiveNodeState(this);
    const element = this.unsafeElement;
    const listenerOptions = { ...options };
    let disposed = false;
    const dispose = (): void => {
      if (disposed) {
        return;
      }
      disposed = true;
      state.cleanups.delete(dispose);
      element.removeEventListener(eventName, handle, listenerOptions.capture);
    };
    const handle = (event: HTMLElementEventMap[EventName]): void => {
      if (listenerOptions.once) {
        dispose();
      }
      listener(event);
    };
    element.addEventListener(eventName, handle, listenerOptions);
    state.cleanups.add(dispose);
    return dispose;
  },
  focus(this: GuiElement, options?: FocusOptions): void {
    getActiveNodeState(this);
    this.unsafeElement.focus(options);
  },
  blur(this: GuiElement): void {
    getActiveNodeState(this);
    this.unsafeElement.blur();
  },
  setPointerCapture(this: GuiElement, pointerId: number): void {
    getActiveNodeState(this);
    this.unsafeElement.setPointerCapture(pointerId);
  },
  releasePointerCapture(this: GuiElement, pointerId: number): void {
    getActiveNodeState(this);
    this.unsafeElement.releasePointerCapture(pointerId);
  },
} satisfies NativeGuiMethods);
