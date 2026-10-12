import type { Instance } from '#internal/runtime/node/instance.js';

import { createRuntimeInspector, type RuntimeInspector } from './inspector.js';
import { inspectionDocument } from './snapshot.js';

/** Owns an opt-in /fkdebug route. Application routers should call open rather than reload the app. */
export type RuntimeInspectorRoute = Readonly<{
  open(): void;
  close(): void;
  dispose(): void;
}>;

/**
 * Lazily mounts the inspector at /fkdebug and releases it on exit. The host must serve its
 * application entry at this path for direct navigation; no router or server is installed.
 * returnTo is used only when /fkdebug was loaded directly, without an application history entry.
 */
export const bindRuntimeInspectorRoute = (
  root: Instance,
  options: Readonly<{ returnTo?: string }> = {},
): RuntimeInspectorRoute => {
  if (root.isDestroyed()) {
    throw new Error('Cannot inspect a destroyed root.');
  }
  const document = inspectionDocument(root);
  const window = document.defaultView!;
  const path = '/fkdebug';
  const returnTo = new URL(options.returnTo ?? '/', window.location.href);
  if (returnTo.origin !== window.location.origin || returnTo.pathname.replace(/\/$/, '') === path) {
    throw new TypeError('The inspector return route must be another path on the same origin.');
  }
  let inspector: RuntimeInspector | undefined;
  let opener: HTMLElement | undefined;
  let disposed = false;
  const isActive = (): boolean => window.location.pathname.replace(/\/$/, '') === path;
  const leave = (): void => {
    if (isActive()) {
      const marker: unknown = window.history.state?.framekitDebug;
      if (marker === true) {
        window.history.back();
      } else {
        window.history.replaceState(window.history.state, '', returnTo);
      }
    }
    if (opener?.isConnected) {
      opener.focus({ preventScroll: true });
    }
    opener = undefined;
  };
  const sync = (): void => {
    if (disposed) {
      return;
    }
    if (isActive()) {
      if (inspector) {
        return;
      }
      inspector = createRuntimeInspector(root);
      inspector.gui.mount(document.body);
      inspector.gui.onDestroy(() => {
        inspector = undefined;
        if (!disposed) {
          leave();
        }
      });
      inspector.gui.unsafeElement
        .querySelector<HTMLElement>('[aria-label="Search runtime hierarchy"]')
        ?.focus({ preventScroll: true });
    } else {
      inspector?.gui.destroy();
    }
  };
  const open = (): void => {
    if (disposed) {
      throw new Error('Inspector route binding has been disposed.');
    }
    if (!isActive()) {
      opener =
        document.activeElement instanceof window.HTMLElement ? document.activeElement : undefined;
      window.history.pushState({ ...window.history.state, framekitDebug: true }, '', path);
    }
    sync();
  };
  const close = (): void => {
    if (inspector) {
      inspector.gui.destroy();
    }
  };
  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    unregisterRoot();
    window.removeEventListener('popstate', sync);
    inspector?.gui.destroy();
    inspector = undefined;
    opener = undefined;
  };
  const unregisterRoot = root.onDestroy(dispose);
  window.addEventListener('popstate', sync);
  try {
    sync();
  } catch (error) {
    dispose();
    throw error;
  }
  return Object.freeze({ open, close, dispose });
};
