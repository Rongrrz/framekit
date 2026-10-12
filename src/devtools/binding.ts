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

/**
 * Mounts a Debug launcher and lazily opens the inspector over the running application.
 */
export const bindRuntimeInspector = (root: Instance): RuntimeInspectorBinding => {
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
    launcher.Enabled = false;
    inspector.gui.mount(document.body);
    inspector.gui.onDestroy(() => {
      inspector = undefined;
      if (!disposed) {
        launcher.Enabled = true;
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
    inspector?.gui.destroy();
    launcher.destroy();
    inspector = undefined;
    opener = undefined;
  };
  const unregisterRoot = root.onDestroy(dispose);
  const launcher = createInspectorLauncher(document, open);
  try {
    launcher.mount(document.body);
  } catch (error) {
    dispose();
    throw error;
  }
  return Object.freeze({ open, close, dispose });
};
