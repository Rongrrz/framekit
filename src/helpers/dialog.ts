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

  if (node.isDestroyed() || element.tagName !== 'DIALOG') {
    throw new TypeError('bindDialog requires a frame created with TagName: dialog.');
  }

  const dialog = element as HTMLDialogElement;
  installFrameKitStyles({ ownerDocument: element.ownerDocument });

  let opener: HTMLElement | undefined;
  let previousFocus: Element | null = null;
  let disposed = false;

  const restoreFocus = (): void => {
    if (opener?.isConnected) {
      opener.focus({ preventScroll: true });
    }

    opener = undefined;
    previousFocus = null;
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
        const active = element.ownerDocument.activeElement;

        // Native close is queued. Preserve focus deliberately moved after the dialog closed.
        if (
          active === previousFocus ||
          active === element.ownerDocument.body ||
          dialog.contains(active)
        ) {
          restoreFocus();
        } else {
          opener = undefined;
          previousFocus = null;
        }
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

      if (
        options.initialFocus &&
        (options.initialFocus.isDestroyed() || !dialog.contains(options.initialFocus.unsafeElement))
      ) {
        throw new TypeError('Initial focus must be a live descendant of the dialog.');
      }

      if (
        trigger &&
        (trigger.isDestroyed() || trigger.unsafeElement.ownerDocument !== element.ownerDocument)
      ) {
        throw new TypeError('The dialog opener must be live and belong to the same document.');
      }

      previousFocus = element.ownerDocument.activeElement;
      opener = trigger?.unsafeElement ?? (previousFocus as HTMLElement | undefined);
      dialog.showModal();
      options.initialFocus?.focus();
    },

    close,
    dispose,
  });
};
