import { createRealmAbortController } from '#internal/dom/environment.js';

import type { FloatingPanelController } from './controller.js';
import type { FloatingPanelPortal } from './portal.js';
import type { PanelOptions } from './types.js';

const focusableContent =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/** Connects pointer, focus, keyboard, and outside-click input to a panel controller. */
export const connectFloatingPanelInteractions = (
  portal: FloatingPanelPortal,
  controller: FloatingPanelController,
  options: PanelOptions,
): (() => void) => {
  const { target, panel, document } = portal;
  const popover = options.kind === 'popover';
  const listeners = createRealmAbortController(target);
  const listenerOptions = { signal: listeners.signal };
  const controls = (): HTMLElement[] =>
    [
      ...(panel.matches(focusableContent) ? [panel] : []),
      ...panel.querySelectorAll<HTMLElement>(focusableContent),
    ].filter((control) => control.tabIndex >= 0);

  target.addEventListener('pointerenter', controller.targetPointerEnter, listenerOptions);
  target.addEventListener('pointerleave', controller.targetPointerLeave, listenerOptions);
  target.addEventListener('pointermove', controller.targetPointerMove, listenerOptions);
  target.addEventListener('focusin', controller.targetFocusIn, listenerOptions);
  target.addEventListener(
    'focusout',
    (event) => controller.focusOut(event.relatedTarget),
    listenerOptions,
  );
  panel.addEventListener('pointerenter', controller.panelPointerEnter, listenerOptions);
  panel.addEventListener('pointerleave', controller.panelPointerLeave, listenerOptions);

  if (popover) {
    panel.addEventListener('focusin', controller.panelFocusIn, listenerOptions);
    panel.addEventListener(
      'focusout',
      (event) => controller.focusOut(event.relatedTarget),
      listenerOptions,
    );
    target.addEventListener('click', controller.togglePinned, listenerOptions);
    target.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key === 'ArrowDown' ||
          (event.key === 'Tab' &&
            !event.shiftKey &&
            controller.isVisible() &&
            controls().length > 0)
        ) {
          event.preventDefault();
          controller.enterPanel();
          controls()[0]?.focus();
        }
      },
      listenerOptions,
    );
    panel.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Tab') {
          return;
        }
        const panelControls = controls();
        if (event.shiftKey && document.activeElement === panelControls[0]) {
          event.preventDefault();
          target.focus();
        } else if (!event.shiftKey && document.activeElement === panelControls.at(-1)) {
          // Continue after the trigger rather than following the portal's unrelated DOM position.
          const pageControls = Array.from(
            document.querySelectorAll<HTMLElement>(focusableContent),
          ).filter(
            (control) =>
              !panel.contains(control) &&
              control.tabIndex >= 0 &&
              control.getClientRects().length > 0,
          );
          const index = pageControls.indexOf(target);
          const next = index < 0 ? undefined : pageControls[(index + 1) % pageControls.length];
          if (next) {
            event.preventDefault();
            next.focus();
          }
        }
      },
      listenerOptions,
    );
    document.addEventListener(
      'pointerdown',
      (event) => {
        if (controller.isVisible() && !controller.inside(event.target)) {
          controller.dismiss();
        }
      },
      { ...listenerOptions, capture: true },
    );
  }

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || !controller.shouldHandleEscape()) {
        return;
      }
      const restoreFocus = popover && panel.contains(document.activeElement);
      if (popover) {
        event.preventDefault();
      }
      controller.dismiss();
      if (restoreFocus) {
        target.focus();
      }
    },
    listenerOptions,
  );

  return () => listeners.abort();
};
