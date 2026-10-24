import type { Instance } from 'framekit';

type Disposable = (() => void) | { destroy(): void } | { abort(): void };

/** Resources belong to one script's parent. Native DOM access stays inside the project document. */
export type ScriptContext = Readonly<{
  parent: Instance;
  root: Instance;
  signal: AbortSignal;
  node(id: string): Instance | undefined;
  query<T extends Element = HTMLElement>(selector: string): T | null;
  own<T extends Disposable>(resource: T): T;
  listen(target: EventTarget, type: string, listener: EventListener): () => void;
  interval(callback: () => void, milliseconds: number): () => void;
  timeout(callback: () => void, milliseconds: number): () => void;
  fetch(url: string | URL, init?: RequestInit): Promise<Response>;
}>;

export type ScriptMount = (
  context: ScriptContext,
) => void | (() => void) | Promise<void | (() => void)>;

/** This module is shared verbatim by presentation and exported applications. */
export const mountScript = (
  mount: ScriptMount,
  parent: Instance,
  root: Instance,
  nodes: ReadonlyMap<string, Instance>,
  networkOrigins: readonly string[],
  report: (error: unknown) => void = console.error,
): (() => void) => {
  const controller = new AbortController();
  const resources = new Set<() => void>();
  const release = (resource: Disposable): void => {
    if (typeof resource === 'function') {
      resource();
    } else if ('destroy' in resource) {
      resource.destroy();
    } else {
      resource.abort();
    }
  };
  const track = (cleanup: () => void): (() => void) => {
    if (controller.signal.aborted) {
      cleanup();
      return () => {};
    }

    if (resources.size >= 256) {
      cleanup();
      throw new Error('A script may own at most 256 active resources.');
    }

    const dispose = (): void => {
      if (resources.delete(dispose)) {
        cleanup();
      }
    };
    resources.add(dispose);
    return dispose;
  };
  const guard =
    (callback: () => void): (() => void) =>
    () => {
      if (!controller.signal.aborted) {
        try {
          callback();
        } catch (error) {
          report(error);
        }
      }
    };
  const context: ScriptContext = {
    parent,
    root,
    signal: controller.signal,
    node: (id) => nodes.get(id),
    query: <T extends Element>(selector: string): T | null =>
      'unsafeElement' in parent
        ? (parent.unsafeElement as HTMLElement).querySelector<T>(selector)
        : null,
    own: (resource) => {
      track(() => release(resource));
      return resource;
    },
    listen: (target, type, listener) => {
      const handler: EventListener = (event) => guard(() => listener(event))();
      target.addEventListener(type, handler);
      return track(() => target.removeEventListener(type, handler));
    },
    interval: (callback, milliseconds) => {
      const id = setInterval(guard(callback), Math.max(16, milliseconds || 0));
      return track(() => clearInterval(id));
    },
    timeout: (callback, milliseconds) => {
      const id = setTimeout(
        () => {
          dispose();
          guard(callback)();
        },
        Math.max(0, milliseconds || 0),
      );
      const dispose = track(() => clearTimeout(id));
      return dispose;
    },
    fetch: async (input, init = {}) => {
      const url = new URL(input);
      if (
        !networkOrigins.includes(url.origin) ||
        !['https:', 'http:'].includes(url.protocol) ||
        url.username ||
        url.password
      ) {
        throw new Error(`Backend origin is not allowed: ${url.origin}. Add it in Script settings.`);
      }

      return fetch(url, {
        ...init,
        credentials: 'omit',
        redirect: 'error',
        signal: AbortSignal.any([controller.signal, ...(init.signal ? [init.signal] : [])]),
      });
    },
  };
  const dispose = (): void => {
    unsubscribe();
    controller.abort();
    for (const cleanup of [...resources].reverse()) {
      try {
        cleanup();
      } catch (error) {
        report(error);
      }
    }
  };
  const unsubscribe = parent.onDestroy(dispose);

  if (parent.isDestroyed()) {
    dispose();
    return dispose;
  }

  try {
    Promise.resolve(mount(context))
      .then((cleanup) => {
        if (cleanup) {
          track(cleanup);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          report(error);
          dispose();
        }
      });
  } catch (error) {
    report(error);
    dispose();
  }

  return dispose;
};
