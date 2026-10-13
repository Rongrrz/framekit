import type { GuiElement } from '#internal/runtime/node/gui-node.js';
import { createSignalEmitter, readonlySignal, type Signal } from '#state/signal.js';

import { isTextEntry } from './composite-keyboard.js';

/** Document-wide keyboard input, owned by an application or feature root. */
export type UserInputService = Readonly<{
  /** A non-repeated key press. Processed means default-prevented or directed to text editing. */
  inputBegan: Signal<[input: KeyboardEvent, processed: boolean]>;
  /** A key release, with the same processed-input rules as inputBegan. */
  inputEnded: Signal<[input: KeyboardEvent, processed: boolean]>;
  /** Tests a physical KeyboardEvent.code, such as KeyW or ArrowLeft, including processed input. */
  isKeyDown(code: string): boolean;
  /** Removes document listeners, clears pressed keys, and releases signal subscriptions. */
  dispose(): void;
}>;

/**
 * Creates one reusable keyboard service for the owner's document. Events bubble through local
 * controls first, so subscribers can respect their handled input. Composition is ignored;
 * blur and hidden documents clear held keys. Destroying the owner disposes the service.
 */
export const createUserInputService = (owner: GuiElement): UserInputService => {
  if (owner.isDestroyed()) {
    throw new Error('Cannot create an input service for a destroyed owner.');
  }
  const document = owner.unsafeElement.ownerDocument;
  const window = document.defaultView;
  const began = createSignalEmitter<[KeyboardEvent, boolean]>();
  const ended = createSignalEmitter<[KeyboardEvent, boolean]>();
  const pressed = new Set<string>();
  const reset = (): void => pressed.clear();
  const visibility = (): void => {
    if (document.visibilityState === 'hidden') {
      reset();
    }
  };
  const keydown = (event: KeyboardEvent): void => {
    if (event.isComposing) {
      return;
    }
    if (event.code) {
      pressed.add(event.code);
    }
    if (!event.repeat) {
      began.emit(event, event.defaultPrevented || isTextEntry(event.target));
    }
  };
  const keyup = (event: KeyboardEvent): void => {
    pressed.delete(event.code);
    if (!event.isComposing) {
      ended.emit(event, event.defaultPrevented || isTextEntry(event.target));
    }
  };
  let disposed = false;
  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    unregisterDestroy();
    document.removeEventListener('keydown', keydown);
    document.removeEventListener('keyup', keyup);
    document.removeEventListener('visibilitychange', visibility);
    window?.removeEventListener('blur', reset);
    reset();
    began.clear();
    ended.clear();
  };
  const unregisterDestroy = owner.onDestroy(dispose);
  document.addEventListener('keydown', keydown);
  document.addEventListener('keyup', keyup);
  document.addEventListener('visibilitychange', visibility);
  window?.addEventListener('blur', reset);
  return Object.freeze({
    inputBegan: readonlySignal(began),
    inputEnded: readonlySignal(ended),
    isKeyDown: (code: string): boolean => pressed.has(code),
    dispose,
  });
};
