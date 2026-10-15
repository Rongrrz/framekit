import { udim2FromOffset } from '#values/udim.js';
import { vector2, type Vector2 } from '#values/vector2.js';

import { createPanelMotion } from './motion.js';
import { panelPosition } from './placement.js';
import type { FloatingPanelPortal } from './portal.js';
import type { PanelOptions } from './types.js';

export type FloatingPanelController = Readonly<{
  targetPointerEnter(event: PointerEvent): void;
  targetPointerLeave(): void;
  targetPointerMove(event: PointerEvent): void;
  targetPointerDown(): void;
  keyboardInput(event: KeyboardEvent): void;
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
  const { target, content, document, window, panel } = portal;
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
  let pointerFocus = false;
  let pinned = false;
  let dismissed = false;
  let pointer: Vector2 | undefined;
  let timer: number | undefined;
  let frame: number | undefined;
  const motion = createPanelMotion(portal, options, () => hideImmediately());

  // Pointer clicks may leave DOM focus behind. Only focus-visible keeps a tooltip open.
  const hasFocus = (): boolean =>
    popover
      ? focused
      : !pointerFocus &&
        target.contains(document.activeElement) &&
        document.activeElement?.matches(':focus-visible') === true;
  const active = (): boolean => pinned || (hoverEnabled && (hovered || panelHovered || hasFocus()));

  const hideImmediately = (): void => {
    window.clearTimeout(timer);
    timer = undefined;
    if (frame !== undefined) {
      window.cancelAnimationFrame(frame);
    }
    frame = undefined;
    motion.cancel();
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
      followCursor && !hasFocus() && pointer
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
    if (!position(motion.showing !== false)) {
      return;
    }
    frame = window.requestAnimationFrame(track);
  };

  const show = (): void => {
    timer = undefined;
    if (disposed || dismissed || !active()) {
      return;
    }
    content.Visible = true;
    if (!portal.isVisible()) {
      motion.prepare();
      portal.show();
    }
    portal.setExpanded(true);
    if (!position()) {
      return;
    }
    if (frame === undefined) {
      frame = window.requestAnimationFrame(track);
    }
    motion.run(true);
  };

  const hide = (): void => {
    timer = undefined;
    if (!portal.isVisible()) {
      return;
    }
    portal.setExpanded(false);
    motion.run(false);
  };

  const update = (): void => {
    window.clearTimeout(timer);
    timer = undefined;
    if (active() && !dismissed) {
      if (portal.isVisible()) {
        if (motion.showing === false) {
          show();
        } else {
          position();
        }
      } else if (hasFocus() || pinned || delay === 0) {
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
    targetPointerDown: (): void => {
      // Clicking an already-focused button may leave :focus-visible matching until blur.
      pointerFocus = true;
      update();
    },
    keyboardInput: (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        pointerFocus = false;
        if (target.contains(document.activeElement)) {
          update();
        }
      }
    },
    targetFocusIn: (): void => {
      focused = true;
      update();
    },
    focusOut: (relatedTarget: EventTarget | null): void => {
      focused = inside(relatedTarget);
      if (!focused) {
        pointerFocus = false;
      }
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
      if (hasFocus() && hoverEnabled) {
        update();
      }
    },
    dispose: (): void => {
      disposed = true;
      hideImmediately();
    },
  });
};
