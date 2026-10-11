import { installFrameKitStyles } from '#internal/dom/stylesheet.js';
import type { GuiElement } from '#internal/runtime/node/gui-node.js';

/** Native modal lifetime and optional initial focus; label the dialog with aria-label or aria-labelledby. */
export type DialogOptions = Readonly<{ initialFocus?: GuiElement }>;

/** A native modal controller. Closing restores the connected element that opened it. */
export type DialogController = Readonly<{
  open(opener?: GuiElement): void;
  close(): void;
  dispose(): void;
}>;

/** Uses a native dialog for top-layer rendering, background inertness, and nested modal focus. */
export const bindDialog = (node: GuiElement, options: DialogOptions = {}): DialogController => {
  const element = node.unsafeElement;
  if (element.tagName !== 'DIALOG') {
    throw new TypeError('bindDialog requires a frame created with tagName: dialog.');
  }
  const dialog = element as HTMLDialogElement;
  installFrameKitStyles({ ownerDocument: element.ownerDocument });
  let opener: HTMLElement | undefined;
  let disposed = false;
  const restoreFocus = (): void => {
    if (opener?.isConnected) {
      opener.focus({ preventScroll: true });
    }
    opener = undefined;
  };
  const close = (): void => {
    if (dialog.open) {
      dialog.close();
    }
    restoreFocus();
  };
  const stops = [
    node.on('close', () => {
      if (!dialog.open) {
        restoreFocus();
      }
    }),
    // Escape belongs to the native topmost dialog, not document-level popover handlers.
    node.on('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
      }
    }),
  ];
  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    unregisterDestroy();
    stops.forEach((stop) => stop());
    close();
  };
  const unregisterDestroy = node.onDestroy(dispose);
  return Object.freeze({
    open: (trigger?: GuiElement): void => {
      if (disposed || node.isDestroyed()) {
        throw new Error('Dialog binding has been disposed.');
      }
      if (dialog.open) {
        return;
      }
      opener =
        trigger?.unsafeElement ?? (element.ownerDocument.activeElement as HTMLElement | undefined);
      dialog.showModal();
      if (options.initialFocus) {
        if (!dialog.contains(options.initialFocus.unsafeElement)) {
          close();
          throw new TypeError('Initial focus must belong to the dialog.');
        }
        options.initialFocus.focus();
      }
    },
    close,
    dispose,
  });
};
