import { createRealmAbortController } from '#internal/dom/environment.js';
import { setStyle } from '#internal/dom/styles.js';
import { udim2FromOffset } from '#values/udim.js';
import { vector2, type Vector2 } from '#values/vector2.js';

import { panelPosition } from './placement.js';
import type { FloatingPanelPortal } from './portal.js';
import { springPanel } from './transition.js';
import type { PanelOptions } from './types.js';

export type FloatingPanelController = Readonly<{
  targetPointerEnter(event: PointerEvent): void;
  targetPointerLeave(): void;
  targetPointerMove(event: PointerEvent): void;
  targetFocusIn(): void;
  focusOut(relatedTarget: EventTarget | null): void;
  panelPointerEnter(): void;
  panelPointerLeave(): void;
  panelFocusIn(): void;
  togglePinned(): void;
  enterPanel(): void;
  dismiss(): void;
  inside(node: EventTarget | null): boolean;
  isVisible(): boolean;
  shouldHandleEscape(): boolean;
  start(): void;
  dispose(): void;
}>;

/** Owns floating-panel visibility, positioning, and transition state. */
export const createFloatingPanelController = (
  portal: FloatingPanelPortal,
  options: PanelOptions,
): FloatingPanelController => {
  const { target, content, document, window, panel, layerElement } = portal;
  const popover = options.kind === 'popover';
  const followCursor = options.kind === 'tooltip' && options.followCursor;
  const hoverEnabled = !popover || options.openOn === 'hover';
  const placement = options.placement ?? (popover || followCursor ? 'bottom' : 'top');
  const gap = options.gap ?? 12;
  const delay = options.delay ?? (popover ? 150 : 300);
  let disposed = false;
  let hovered = false;
  let panelHovered = false;
  let focused = target.contains(document.activeElement);
  let pinned = false;
  let dismissed = false;
  let pointer: Vector2 | undefined;
  let timer: number | undefined;
  let frame: number | undefined;
  let transition: Readonly<{ controller: AbortController; showing: boolean }> | undefined;
  const springMotion = { value: 0, velocity: 0 };

  const active = (): boolean => pinned || (hoverEnabled && (hovered || panelHovered || focused));

  const stopTransition = (): void => {
    const previous = transition;
    transition = undefined;
    previous?.controller.abort();
  };

  const hideImmediately = (): void => {
    window.clearTimeout(timer);
    timer = undefined;
    if (frame !== undefined) {
      window.cancelAnimationFrame(frame);
    }
    frame = undefined;
    stopTransition();
    portal.hide();
    panelHovered = false;
    portal.setExpanded(false);
  };

  const position = (updatePlacement = true): boolean => {
    const bounds = target.getBoundingClientRect();
    if (!target.isConnected || (bounds.width === 0 && bounds.height === 0)) {
      hideImmediately();
      hovered = focused = pinned = false;
      return false;
    }
    if (!updatePlacement) {
      return !disposed && portal.isVisible();
    }
    const panelBounds = panel.getBoundingClientRect();
    const anchor =
      followCursor && !focused && pointer
        ? { left: pointer.X, right: pointer.X, top: pointer.Y, bottom: pointer.Y }
        : bounds;
    const point = panelPosition(
      anchor,
      panelBounds,
      placement,
      gap,
      document.documentElement.clientWidth || window.innerWidth,
      document.documentElement.clientHeight || window.innerHeight,
    );
    const x = content.Position.X.Offset + point.X - panelBounds.left;
    const y = content.Position.Y.Offset + point.Y - panelBounds.top;
    if (x !== content.Position.X.Offset || y !== content.Position.Y.Offset) {
      content.Position = udim2FromOffset(x, y);
    }
    return !disposed && portal.isVisible();
  };

  const track = (): void => {
    frame = undefined;
    if (disposed || !portal.isVisible()) {
      return;
    }
    // A closing cursor panel fades at its last position rather than jumping back to the trigger.
    if (!position(transition?.showing !== false)) {
      return;
    }
    frame = window.requestAnimationFrame(track);
  };

  const runTransition = (showing: boolean): void => {
    if (transition?.showing === showing) {
      return;
    }
    stopTransition();
    const current = { controller: createRealmAbortController(target), showing };
    transition = current;
    const hook = showing ? options.onShow : options.onHide;
    const finish = (): void => {
      if (disposed || transition !== current || current.controller.signal.aborted) {
        return;
      }
      if (!showing) {
        hideImmediately();
      }
    };
    const fail = (error: unknown): void => {
      if (current.controller.signal.aborted || transition !== current) {
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

  const show = (): void => {
    timer = undefined;
    if (disposed || dismissed || !active()) {
      return;
    }
    content.Visible = true;
    if (!portal.isVisible()) {
      springMotion.velocity = 0;
      setStyle(layerElement, 'opacity', options.onShow ? '1' : '0');
      portal.show();
    }
    portal.setExpanded(true);
    if (!position()) {
      return;
    }
    if (frame === undefined) {
      frame = window.requestAnimationFrame(track);
    }
    runTransition(true);
  };

  const hide = (): void => {
    timer = undefined;
    if (!portal.isVisible()) {
      return;
    }
    portal.setExpanded(false);
    runTransition(false);
  };

  const update = (): void => {
    window.clearTimeout(timer);
    timer = undefined;
    if (active() && !dismissed) {
      if (portal.isVisible()) {
        if (transition?.showing === false) {
          show();
        } else {
          position();
        }
      } else if (focused || pinned || delay === 0) {
        show();
      } else {
        timer = window.setTimeout(show, delay);
      }
      return;
    }
    if (!active()) {
      dismissed = false;
    }
    if (!portal.isVisible()) {
      return;
    }
    if (followCursor) {
      hide();
    } else {
      // Static content remains reachable across the small gap between it and the trigger.
      timer = window.setTimeout(hide, 80);
    }
  };

  const dismiss = (): void => {
    dismissed = true;
    pinned = false;
    window.clearTimeout(timer);
    timer = undefined;
    hide();
  };

  const inside = (node: EventTarget | null): boolean =>
    node instanceof window.Node && (target.contains(node) || (popover && panel.contains(node)));

  return Object.freeze({
    targetPointerEnter: (event: PointerEvent): void => {
      if (!hoverEnabled || event.pointerType === 'touch') {
        return;
      }
      hovered = true;
      pointer = vector2(event.clientX, event.clientY);
      update();
    },
    targetPointerLeave: (): void => {
      hovered = false;
      update();
    },
    targetPointerMove: (event: PointerEvent): void => {
      pointer = vector2(event.clientX, event.clientY);
      if (followCursor && hovered && portal.isVisible() && !dismissed) {
        position();
      }
    },
    targetFocusIn: (): void => {
      focused = true;
      update();
    },
    focusOut: (relatedTarget: EventTarget | null): void => {
      focused = inside(relatedTarget);
      if (popover && !focused) {
        pinned = false;
      }
      update();
    },
    panelPointerEnter: (): void => {
      if (!followCursor) {
        panelHovered = true;
        update();
      }
    },
    panelPointerLeave: (): void => {
      if (!followCursor) {
        panelHovered = false;
        update();
      }
    },
    panelFocusIn: (): void => {
      focused = true;
      update();
    },
    togglePinned: (): void => {
      if (pinned && !dismissed) {
        dismiss();
      } else {
        dismissed = false;
        pinned = true;
        show();
      }
    },
    enterPanel: (): void => {
      dismissed = false;
      pinned = true;
      show();
    },
    dismiss,
    inside,
    isVisible: portal.isVisible,
    shouldHandleEscape: (): boolean => active() || portal.isVisible() || timer !== undefined,
    start: (): void => {
      if (focused && hoverEnabled) {
        update();
      }
    },
    dispose: (): void => {
      disposed = true;
      hideImmediately();
    },
  });
};
