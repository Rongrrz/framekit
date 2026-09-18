import {
  solveSpring,
  type ResolvedSpringOptions,
  type SpringSolution,
} from '../animation/spring-physics.js';
import { createRealmAbortController } from '../core/dom/environment.js';
import { setStyle } from '../core/dom/styles.js';
import {
  createScreenGui,
  udim2FromOffset,
  vector2,
  type GuiElement,
  type GuiObject,
  type Unsubscribe,
  type Vector2,
} from '../core/index.js';
import {
  assertAllowedValue,
  assertBoolean,
  assertNonNegativeFinite,
} from '../core/internal/validation.js';

/** Preferred side of a floating panel; flips to the opposite side when it offers more room. */
export type FloatingPanelPlacement = 'top' | 'bottom' | 'left' | 'right';

/** Animation input. Abort stops a superseded transition or one whose binding was disposed. */
export type FloatingPanelContext = Readonly<{
  content: GuiObject;
  signal: AbortSignal;
}>;

/** Return a promise to keep content visible until the transition settles. Honor signal to cancel animation work. */
export type FloatingPanelHook = (context: FloatingPanelContext) => void | Promise<void>;

type PanelOptions = Readonly<{
  placement?: FloatingPanelPlacement;
  gap?: number;
  delay?: number;
  onShow?: FloatingPanelHook;
  onHide?: FloatingPanelHook;
}> &
  (
    | Readonly<{ kind: 'tooltip'; followCursor: boolean; destroyContent?: boolean }>
    | Readonly<{ kind: 'popover'; openOn: 'hover' | 'click' }>
  );

const interactiveContent =
  'button, input, select, textarea, a[href], [tabindex], [contenteditable]:not([contenteditable="false"])';
const focusableContent =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
const oppositeSide = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const;
const viewportMargin = 8;
// Critical damping makes opacity settle quickly without bouncing beyond its visible range.
const panelSpringOptions = {
  tension: 900,
  friction: 60,
  mass: 1,
  precision: 0.005,
  restVelocity: 0.08,
} satisfies ResolvedSpringOptions;
let nextPanelId = 0;

/** Validates before generated content is allocated or caller-owned content is changed. */
export const validatePanelOptions = (target: GuiElement, options: PanelOptions): void => {
  if (target.isDestroyed()) throw new Error('Floating panel target has been destroyed.');
  if (!target.unsafeElement.ownerDocument.defaultView)
    throw new Error('Floating panel requires a document with a window.');
  if (options.kind === 'tooltip') assertBoolean(options.followCursor, 'ToolTip followCursor');
  else assertAllowedValue(options.openOn, ['hover', 'click'], 'Popover openOn');
  if (options.placement !== undefined)
    assertAllowedValue(
      options.placement,
      ['top', 'bottom', 'left', 'right'],
      'Floating panel placement',
    );
  if (options.gap !== undefined) assertNonNegativeFinite(options.gap, 'Floating panel gap');
  if (options.delay !== undefined) assertNonNegativeFinite(options.delay, 'Floating panel delay');
  for (const hook of [options.onShow, options.onHide]) {
    if (hook !== undefined && typeof hook !== 'function')
      throw new TypeError('Floating panel hooks must be functions.');
  }
};

/** Owns the portal, placement, transition cancellation, interaction, and binding lifetime. */
export const bindFloatingPanel = (
  target: GuiElement,
  content: GuiObject,
  options: PanelOptions,
): Unsubscribe => {
  validatePanelOptions(target, options);
  const element = target.unsafeElement;
  const document = element.ownerDocument;
  const window = document.defaultView!;
  const panel = content.unsafeElement;
  const popover = options.kind === 'popover';
  const followCursor = options.kind === 'tooltip' && options.followCursor;
  const hoverEnabled = !popover || options.openOn === 'hover';
  const placement = options.placement ?? (popover || followCursor ? 'bottom' : 'top');
  const gap = options.gap ?? 12;
  const delay = options.delay ?? (popover ? 150 : 300);
  if (content.isDestroyed()) throw new Error('Floating panel content has been destroyed.');
  if (content === target || content.Parent || panel.isConnected)
    throw new Error('Floating panel content must be detached.');
  if (panel.ownerDocument !== document)
    throw new TypeError('Floating panel content must belong to the target document.');
  if (!popover && (panel.matches(interactiveContent) || panel.querySelector(interactiveContent)))
    throw new TypeError('ToolTip content must be non-interactive.');
  if (panel.id && document.getElementById(panel.id))
    throw new Error('Floating panel content must have a unique id.');
  const original = {
    position: content.Position,
    anchor: content.AnchorPoint,
    visible: content.Visible,
    id: panel.getAttribute('id'),
    role: panel.getAttribute('role'),
    pointerEvents: panel.style.pointerEvents,
    expanded: element.getAttribute('aria-expanded'),
  };
  const id = panel.id || createPanelId(document, options.kind);
  const relation = popover ? 'aria-controls' : 'aria-describedby';
  const relationAlreadyPresent = (element.getAttribute(relation) ?? '').split(/\s+/).includes(id);
  const layer = createScreenGui(
    { Name: popover ? 'PopoverLayer' : 'ToolTipLayer', Enabled: false, DisplayOrder: 2147483647 },
    { ownerDocument: document },
  );
  const layerElement = layer.unsafeElement;
  Object.assign(layerElement.style, {
    pointerEvents: 'none',
    margin: '0',
    padding: '0',
    border: '0',
    background: 'transparent',
  });
  const supportsPopover = typeof layerElement.showPopover === 'function';
  if (supportsPopover) layerElement.setAttribute('popover', 'manual');
  content.setProperties({
    Position: udim2FromOffset(0, 0),
    AnchorPoint: vector2(0, 0),
    Visible: true,
  });
  panel.id = id;
  panel.setAttribute('role', popover ? (original.role ?? 'group') : 'tooltip');
  panel.style.pointerEvents = followCursor ? 'none' : 'auto';
  content.Parent = layer;
  // Modal dialogs make outside content inert even when it enters the top layer.
  layer.mount(element.closest('dialog') ?? document.body ?? document.documentElement);
  if (!relationAlreadyPresent)
    element.setAttribute(relation, [element.getAttribute(relation), id].filter(Boolean).join(' '));
  if (popover) element.setAttribute('aria-expanded', 'false');

  const listeners = createRealmAbortController(element);
  const listenerOptions = { signal: listeners.signal };
  let disposed = false;
  let hovered = false;
  let panelHovered = false;
  let focused = element.contains(document.activeElement);
  let pinned = false;
  let dismissed = false;
  let pointer: Vector2 | undefined;
  let timer: number | undefined;
  let frame: number | undefined;
  let transition: Readonly<{ controller: AbortController; showing: boolean }> | undefined;
  const springMotion: SpringSolution = { value: 0, velocity: 0 };

  const active = (): boolean => pinned || (hoverEnabled && (hovered || panelHovered || focused));
  const stopTransition = (): void => {
    const previous = transition;
    transition = undefined;
    previous?.controller.abort();
  };
  const hideImmediately = (): void => {
    window.clearTimeout(timer);
    timer = undefined;
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    frame = undefined;
    stopTransition();
    if (!layer.isDestroyed() && layer.Enabled) {
      if (supportsPopover) layerElement.hidePopover();
      layer.Enabled = false;
    }
    panelHovered = false;
    if (popover) element.setAttribute('aria-expanded', 'false');
  };
  const position = (updatePlacement = true): boolean => {
    const bounds = element.getBoundingClientRect();
    if (!element.isConnected || (bounds.width === 0 && bounds.height === 0)) {
      hideImmediately();
      hovered = focused = pinned = false;
      return false;
    }
    if (!updatePlacement) return !disposed && layer.Enabled;
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
    if (x !== content.Position.X.Offset || y !== content.Position.Y.Offset)
      content.Position = udim2FromOffset(x, y);
    return !disposed && layer.Enabled;
  };
  const track = (): void => {
    frame = undefined;
    if (disposed || !layer.Enabled) return;
    // A closing cursor panel fades at its last position rather than jumping back to the trigger.
    if (!position(transition?.showing !== false)) return;
    frame = window.requestAnimationFrame(track);
  };
  const runTransition = (showing: boolean): void => {
    if (transition?.showing === showing) return;
    stopTransition();
    const current = { controller: createRealmAbortController(element), showing };
    transition = current;
    const hook = showing ? options.onShow : options.onHide;
    const finish = (): void => {
      if (disposed || transition !== current || current.controller.signal.aborted) return;
      if (!showing) hideImmediately();
    };
    const fail = (error: unknown): void => {
      if (current.controller.signal.aborted || transition !== current) return;
      finish();
      window.console.error('Floating panel animation hook failed.', error);
    };
    try {
      // Custom animations act on content; the owned layer must not mask their opacity.
      if (hook) {
        springMotion.velocity = 0;
        setStyle(layerElement, 'opacity', '1');
      }
      const result = hook
        ? hook({ content, signal: current.controller.signal })
        : springPanel(layerElement, showing, current.controller.signal, window, springMotion);
      if (!result) finish();
      else void result.then(finish, fail);
    } catch (error) {
      fail(error);
    }
  };
  const show = (): void => {
    timer = undefined;
    if (disposed || dismissed || !active()) return;
    content.Visible = true;
    if (!layer.Enabled) {
      springMotion.velocity = 0;
      setStyle(layerElement, 'opacity', options.onShow ? '1' : '0');
      layer.Enabled = true;
      if (supportsPopover) layerElement.showPopover();
    }
    if (popover) element.setAttribute('aria-expanded', 'true');
    if (!position()) return;
    if (frame === undefined) frame = window.requestAnimationFrame(track);
    runTransition(true);
  };
  const hide = (): void => {
    timer = undefined;
    if (!layer.Enabled) return;
    if (popover) element.setAttribute('aria-expanded', 'false');
    runTransition(false);
  };
  const update = (): void => {
    window.clearTimeout(timer);
    timer = undefined;
    if (active() && !dismissed) {
      if (layer.Enabled) {
        if (transition?.showing === false) show();
        else position();
      } else if (focused || pinned || delay === 0) show();
      else timer = window.setTimeout(show, delay);
      return;
    }
    if (!active()) dismissed = false;
    if (!layer.Enabled) return;
    if (followCursor) hide();
    // Static content remains reachable across the small gap between it and the trigger.
    else timer = window.setTimeout(hide, 80);
  };
  const dismiss = (): void => {
    dismissed = true;
    pinned = false;
    window.clearTimeout(timer);
    timer = undefined;
    hide();
  };
  const inside = (node: EventTarget | null): boolean =>
    node instanceof window.Node && (element.contains(node) || (popover && panel.contains(node)));
  const controls = (): HTMLElement[] =>
    [
      ...(panel.matches(focusableContent) ? [panel] : []),
      ...panel.querySelectorAll<HTMLElement>(focusableContent),
    ].filter((control) => control.tabIndex >= 0);
  const enterPanel = (): void => {
    dismissed = false;
    pinned = true;
    show();
    controls()[0]?.focus();
  };
  element.addEventListener(
    'pointerenter',
    (event) => {
      if (!hoverEnabled || event.pointerType === 'touch') return;
      hovered = true;
      pointer = vector2(event.clientX, event.clientY);
      update();
    },
    listenerOptions,
  );
  element.addEventListener(
    'pointerleave',
    () => {
      hovered = false;
      update();
    },
    listenerOptions,
  );
  element.addEventListener(
    'pointermove',
    (event) => {
      pointer = vector2(event.clientX, event.clientY);
      if (followCursor && hovered && layer.Enabled && !dismissed) position();
    },
    listenerOptions,
  );
  element.addEventListener(
    'focusin',
    () => {
      focused = true;
      update();
    },
    listenerOptions,
  );
  const leaveFocus = (event: FocusEvent): void => {
    focused = inside(event.relatedTarget);
    if (popover && !focused) pinned = false;
    update();
  };
  element.addEventListener('focusout', leaveFocus, listenerOptions);
  panel.addEventListener(
    'pointerenter',
    () => {
      if (followCursor) return;
      panelHovered = true;
      update();
    },
    listenerOptions,
  );
  panel.addEventListener(
    'pointerleave',
    () => {
      if (followCursor) return;
      panelHovered = false;
      update();
    },
    listenerOptions,
  );
  if (popover) {
    panel.addEventListener(
      'focusin',
      () => {
        focused = true;
        update();
      },
      listenerOptions,
    );
    panel.addEventListener('focusout', leaveFocus, listenerOptions);
    element.addEventListener(
      'click',
      () => {
        if (pinned && !dismissed) dismiss();
        else {
          dismissed = false;
          pinned = true;
          show();
        }
      },
      listenerOptions,
    );
    element.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key === 'ArrowDown' ||
          (event.key === 'Tab' &&
            !event.shiftKey &&
            layer.Enabled &&
            !dismissed &&
            controls().length)
        ) {
          event.preventDefault();
          enterPanel();
        }
      },
      listenerOptions,
    );
    panel.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Tab') return;
        const panelControls = controls();
        if (event.shiftKey && document.activeElement === panelControls[0]) {
          event.preventDefault();
          element.focus();
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
          const index = pageControls.indexOf(element);
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
        if (layer.Enabled && !inside(event.target)) dismiss();
      },
      { ...listenerOptions, capture: true },
    );
  }
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || !(active() || layer.Enabled || timer !== undefined)) return;
      const restoreFocus = popover && panel.contains(document.activeElement);
      if (popover) event.preventDefault();
      dismiss();
      if (restoreFocus) element.focus();
    },
    listenerOptions,
  );

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    hideImmediately();
    listeners.abort();
    unregisterTargetDestroy();
    unregisterContentDestroy();
    if (!relationAlreadyPresent) {
      const remaining = (element.getAttribute(relation) ?? '')
        .split(/\s+/)
        .filter((token) => token && token !== id);
      if (remaining.length) element.setAttribute(relation, remaining.join(' '));
      else element.removeAttribute(relation);
    }
    if (popover) restoreAttribute(element, 'aria-expanded', original.expanded);
    if (!content.isDestroyed()) {
      content.Parent = undefined;
      if (options.kind === 'tooltip' && options.destroyContent) content.destroy();
      else {
        content.setProperties({
          Position: original.position,
          AnchorPoint: original.anchor,
          Visible: original.visible,
        });
        restoreAttribute(panel, 'id', original.id);
        restoreAttribute(panel, 'role', original.role);
        panel.style.pointerEvents = original.pointerEvents;
      }
    }
    layer.destroy();
  };
  const unregisterTargetDestroy = target.onDestroy(dispose);
  const unregisterContentDestroy = content.onDestroy(dispose);
  if (focused && hoverEnabled) update();
  return dispose;
};

const createPanelId = (document: Document, kind: 'tooltip' | 'popover'): string => {
  const id = `framekit-${kind}-${++nextPanelId}`;
  return document.getElementById(id) ? createPanelId(document, kind) : id;
};
const restoreAttribute = (element: HTMLElement, name: string, value: string | null): void => {
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
};

/** Springs the owned layer's opacity, retaining velocity when an in-flight transition reverses. */
const springPanel = (
  element: HTMLElement,
  showing: boolean,
  signal: AbortSignal,
  window: Window,
  motion: SpringSolution,
): void | Promise<void> => {
  const destination = showing ? 1 : 0;
  motion.value = Number(element.style.opacity || '1');
  if (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
    (motion.value === destination && Math.abs(motion.velocity) <= panelSpringOptions.restVelocity)
  ) {
    motion.value = destination;
    motion.velocity = 0;
    setStyle(element, 'opacity', String(destination));
    return;
  }
  let previousTimestamp = window.performance.now();
  return new Promise<void>((resolve) => {
    let frame: number;
    const complete = (): void => {
      window.cancelAnimationFrame(frame);
      signal.removeEventListener('abort', complete);
      resolve();
    };
    const tick = (): void => {
      if (signal.aborted) return;
      const now = window.performance.now();
      solveSpring(
        motion.value,
        motion.velocity,
        destination,
        Math.max(0, (now - previousTimestamp) / 1000),
        panelSpringOptions,
        motion,
      );
      previousTimestamp = now;
      const settled =
        Math.abs(motion.value - destination) <= panelSpringOptions.precision &&
        Math.abs(motion.velocity) <= panelSpringOptions.restVelocity;
      if (settled) {
        motion.value = destination;
        motion.velocity = 0;
      }
      setStyle(element, 'opacity', String(Math.max(0, Math.min(1, motion.value))));
      if (settled) complete();
      else frame = window.requestAnimationFrame(tick);
    };
    signal.addEventListener('abort', complete, { once: true });
    frame = window.requestAnimationFrame(tick);
  });
};
type AnchorBounds = Readonly<{ left: number; right: number; top: number; bottom: number }>;

const panelPosition = (
  anchor: AnchorBounds,
  size: Readonly<{ width: number; height: number }>,
  preferredSide: FloatingPanelPlacement,
  gap: number,
  viewportWidth: number,
  viewportHeight: number,
): Vector2 => {
  const space = {
    top: anchor.top - viewportMargin,
    bottom: viewportHeight - anchor.bottom - viewportMargin,
    left: anchor.left - viewportMargin,
    right: viewportWidth - anchor.right - viewportMargin,
  };
  const needed =
    (preferredSide === 'top' || preferredSide === 'bottom' ? size.height : size.width) + gap;
  const opposite = oppositeSide[preferredSide];
  const side =
    space[preferredSide] < needed && space[opposite] > space[preferredSide]
      ? opposite
      : preferredSide;
  const x =
    side === 'left'
      ? anchor.left - size.width - gap
      : side === 'right'
        ? anchor.right + gap
        : (anchor.left + anchor.right - size.width) / 2;
  const y =
    side === 'top'
      ? anchor.top - size.height - gap
      : side === 'bottom'
        ? anchor.bottom + gap
        : (anchor.top + anchor.bottom - size.height) / 2;
  return vector2(
    Math.max(viewportMargin, Math.min(x, viewportWidth - size.width - viewportMargin)),
    Math.max(viewportMargin, Math.min(y, viewportHeight - size.height - viewportMargin)),
  );
};
