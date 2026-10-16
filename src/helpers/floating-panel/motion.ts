import { createRealmAbortController } from '#internal/dom/environment.js';
import { setStyle } from '#internal/dom/styles.js';

import type { FloatingPanelPortal } from './portal.js';
import { springPanel } from './transition.js';
import type { PanelOptions } from './types.js';

type PanelMotion = Readonly<{
  showing: boolean | undefined;
  prepare(): void;
  run(showing: boolean): void;
  cancel(): void;
}>;

/** Owns transition cancellation, hook failures, and retained spring velocity. */
export const createPanelMotion = (
  portal: FloatingPanelPortal,
  options: PanelOptions,
  onHidden: () => void,
): PanelMotion => {
  const { target, content, window, layerElement } = portal;
  let active: Readonly<{ controller: AbortController; showing: boolean }> | undefined;
  const springMotion = { value: 0, velocity: 0 };

  const cancel = (): void => {
    const previous = active;
    active = undefined;
    previous?.controller.abort();
  };

  const run = (showing: boolean): void => {
    if (active?.showing === showing) {
      return;
    }

    cancel();

    const current = { controller: createRealmAbortController(target), showing };
    active = current;

    const hook = showing ? options.onShow : options.onHide;

    const finish = (): void => {
      if (active !== current || current.controller.signal.aborted) {
        return;
      }

      if (!showing) {
        onHidden();
      }
    };

    const fail = (error: unknown): void => {
      if (current.controller.signal.aborted || active !== current) {
        return;
      }

      finish();
      window.console.error('Floating panel animation hook failed.', error);
    };

    try {
      if (hook) {
        springMotion.velocity = 0;
        setStyle(layerElement, 'opacity', '1');
      }

      const result = hook
        ? hook({ content, signal: current.controller.signal })
        : springPanel(layerElement, showing, current.controller.signal, window, springMotion);

      if (!result) {
        finish();
      } else {
        void result.then(finish, fail);
      }
    } catch (error) {
      fail(error);
    }
  };

  return Object.freeze({
    get showing() {
      return active?.showing;
    },

    cancel,
    run,

    prepare: (): void => {
      springMotion.velocity = 0;
      setStyle(layerElement, 'opacity', options.onShow ? '1' : '0');
    },
  });
};
