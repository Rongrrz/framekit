import { isTextEntry } from '#helpers/composite-keyboard.js';
import type { Instance } from '#internal/runtime/node/instance.js';

import { createRuntimeInspector, type RuntimeInspector } from './inspector.js';
import { inspectionDocument } from './snapshot.js';
import { createInspectorLauncher } from './view.js';

/** An opt-in inspector overlay. Opening and closing it never changes the host URL or history. */
export type RuntimeInspectorBinding = Readonly<{
  open(): void;
  close(): void;
  dispose(): void;
}>;

/** Exact modifier matching avoids stealing a different application shortcut. */
export type RuntimeInspectorShortcut = Readonly<{
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}>;

/** The launcher defaults to visible. Shortcuts are opt-in and toggle the inspector. */
export type RuntimeInspectorOptions = Readonly<{
  button?: boolean;
  shortcut?: RuntimeInspectorShortcut;
}>;

/**
 * Mounts a Debug launcher and lazily opens the inspector over the running application.
 */
export const bindRuntimeInspector = (
  root: Instance,
  options: RuntimeInspectorOptions = {},
): RuntimeInspectorBinding => {
  if (root.isDestroyed()) {
    throw new Error('Cannot inspect a destroyed root.');
  }
  const document = inspectionDocument(root);
  const window = document.defaultView!;
  let inspector: RuntimeInspector | undefined;
  let opener: HTMLElement | undefined;
  let disposed = false;
  const open = (): void => {
    if (disposed) {
      throw new Error('Inspector binding has been disposed.');
    }
    if (inspector) {
      return;
    }
    opener =
      document.activeElement instanceof window.HTMLElement ? document.activeElement : undefined;
    inspector = createRuntimeInspector(root);
    if (launcher) {
      launcher.Enabled = false;
    }
    inspector.gui.mount(document.body);
    inspector.gui.onDestroy(() => {
      inspector = undefined;
      if (!disposed) {
        if (launcher) {
          launcher.Enabled = true;
        }
        if (opener?.isConnected) {
          opener.focus({ preventScroll: true });
        }
      }
      opener = undefined;
    });
    inspector.gui.unsafeElement
      .querySelector<HTMLElement>('[aria-label="Search runtime hierarchy"]')
      ?.focus({ preventScroll: true });
  };
  const close = (): void => {
    inspector?.gui.destroy();
  };
  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    unregisterRoot();
    document.removeEventListener('keydown', keydown);
    inspector?.gui.destroy();
    launcher?.destroy();
    inspector = undefined;
    opener = undefined;
  };
  const keydown = (event: KeyboardEvent): void => {
    const shortcut = options.shortcut;
    if (
      !shortcut ||
      event.defaultPrevented ||
      event.repeat ||
      event.isComposing ||
      (isTextEntry(event.target) &&
        !/^F([1-9]|1[0-9]|2[0-4])$/.test(event.key) &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey) ||
      event.key.toLowerCase() !== shortcut.key.toLowerCase() ||
      event.ctrlKey !== (shortcut.ctrlKey ?? false) ||
      event.metaKey !== (shortcut.metaKey ?? false) ||
      event.altKey !== (shortcut.altKey ?? false) ||
      event.shiftKey !== (shortcut.shiftKey ?? false)
    ) {
      return;
    }
    event.preventDefault();
    if (inspector) {
      close();
    } else {
      open();
    }
  };
  const unregisterRoot = root.onDestroy(dispose);
  const shortcut = options.shortcut;
  const shortcutLabel = shortcut
    ? [
        shortcut.ctrlKey && 'Control',
        shortcut.metaKey && 'Meta',
        shortcut.altKey && 'Alt',
        shortcut.shiftKey && 'Shift',
        shortcut.key,
      ]
        .filter(Boolean)
        .join('+')
    : undefined;
  const launcher =
    options.button === false ? undefined : createInspectorLauncher(document, open, shortcutLabel);
  try {
    launcher?.mount(document.body);
    if (options.shortcut) {
      document.addEventListener('keydown', keydown);
    }
  } catch (error) {
    dispose();
    throw error;
  }
  return Object.freeze({ open, close, dispose });
};
