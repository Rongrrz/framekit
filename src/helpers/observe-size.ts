import { createRealmAbortController } from '#internal/dom/environment.js';
import type { GuiElement } from '#internal/runtime/node/gui-node.js';
import type { Unsubscribe } from '#state/signal.js';
import { vector2, type Vector2 } from '#values/vector2.js';

/**
 * Delivers the current size synchronously, then changed sizes once per animation frame.
 * Defaults to the owner's rendered size; pass another GUI or 'Viewport' to observe it instead.
 * Element observation follows layout resizing; transforms alone do not trigger delivery.
 * Disposing or destroying either GUI releases the observation and any pending delivery.
 */
export const observeSize = (
  owner: GuiElement,
  listener: (size: Vector2) => void,
  observe: GuiElement | 'Viewport' = owner,
): Unsubscribe => {
  if (owner.isDestroyed() || (observe !== 'Viewport' && observe.isDestroyed())) {
    throw new Error('Size observation requires live GUI objects.');
  }

  const element = owner.unsafeElement;
  const window = element.ownerDocument.defaultView;

  if (!window) {
    throw new Error('Size observation requires a document with a window.');
  }

  if (observe !== 'Viewport' && observe.unsafeElement.ownerDocument !== element.ownerDocument) {
    throw new TypeError('Size observation must remain in the owner document.');
  }

  let frame: number | undefined;
  let previous: Vector2 | undefined;
  let disposed = false;
  const stops: Unsubscribe[] = [];

  const dispose = (): void => {
    if (disposed) {
      return;
    }

    disposed = true;

    if (frame !== undefined) {
      window.cancelAnimationFrame(frame);
    }

    for (const stop of stops) {
      stop();
    }
  };

  const deliver = (): void => {
    frame = undefined;

    if (disposed) {
      return;
    }

    const size =
      observe === 'Viewport'
        ? vector2(window.innerWidth, window.innerHeight)
        : observe.AbsoluteSize;

    if (previous && size.X === previous.X && size.Y === previous.Y) {
      return;
    }

    previous = size;
    listener(size);
  };

  const schedule = (): void => {
    if (!disposed && frame === undefined) {
      frame = window.requestAnimationFrame(deliver);
    }
  };

  stops.push(owner.onDestroy(dispose));

  try {
    if (observe === 'Viewport') {
      const controller = createRealmAbortController(element);
      window.addEventListener('resize', schedule, { signal: controller.signal });
      stops.push(() => controller.abort());
    } else {
      const Constructor = window.ResizeObserver ?? globalThis.ResizeObserver;

      if (typeof Constructor !== 'function') {
        throw new Error('Size observation requires ResizeObserver.');
      }

      const observer = new Constructor(schedule);
      stops.push(() => observer.disconnect());

      if (observe !== owner) {
        stops.push(observe.onDestroy(dispose));
      }

      observer.observe(observe.unsafeElement, { box: 'border-box' });
    }

    deliver();
  } catch (error) {
    dispose();

    throw error;
  }

  return dispose;
};
