import { createRealmAbortController } from '#internal/dom/environment.js';
import type { GuiElement } from '#internal/runtime/node/gui-node.js';
import { assertNonNegativeFinite } from '#internal/validation.js';
import type { Unsubscribe } from '#state/signal.js';

/** Size and breakpoint details supplied when a container layout becomes active. */
export type ResponsiveLayoutContext = Readonly<{
  width: number;
  height: number;
  breakpoint: ResponsiveLayoutBreakpoint;
  previousBreakpoint: ResponsiveLayoutBreakpoint | undefined;
}>;

/** One ordered container-width range and the layout it activates. */
export type ResponsiveLayoutBreakpoint = Readonly<{
  /** Inclusive upper width. Omit only from the final fallback entry. */
  maxWidth?: number;
  apply: (context: ResponsiveLayoutContext) => void;
}>;

/** Existing viewport-based responsive layout configuration. */
export type ViewportResponsiveLayoutOptions = Readonly<{
  breakpoint: number;
  mobile: () => void;
  desktop: () => void;
}>;

/** Container-based responsive layout configuration. */
export type ContainerResponsiveLayoutOptions = Readonly<{
  observe: GuiElement;
  breakpoints: readonly [ResponsiveLayoutBreakpoint, ...ResponsiveLayoutBreakpoint[]];
}>;

export type ResponsiveLayoutOptions =
  | ViewportResponsiveLayoutOptions
  | ContainerResponsiveLayoutOptions;

type ViewportLayout = 'mobile' | 'desktop';

/** Applies a viewport or container layout now and whenever its active breakpoint changes. */
export function bindResponsiveLayout(
  owner: GuiElement,
  options: ResponsiveLayoutOptions,
): Unsubscribe {
  if (owner.isDestroyed()) {
    throw new Error('Responsive layout owner has been destroyed.');
  }

  return 'breakpoints' in options
    ? bindContainerLayout(owner, options)
    : bindViewportLayout(owner, options);
}

function bindViewportLayout(
  owner: GuiElement,
  options: ViewportResponsiveLayoutOptions,
): Unsubscribe {
  assertNonNegativeFinite(options.breakpoint, 'Breakpoint');

  if (typeof options.mobile !== 'function') {
    throw new TypeError('Mobile layout must be a function.');
  }

  if (typeof options.desktop !== 'function') {
    throw new TypeError('Desktop layout must be a function.');
  }

  const ownerWindow = owner.unsafeElement.ownerDocument.defaultView;
  if (!ownerWindow) {
    throw new Error('Responsive layout requires a document with a window.');
  }

  let currentLayout: ViewportLayout | undefined;
  const updateLayout = (): void => {
    const nextLayout = ownerWindow.innerWidth < options.breakpoint ? 'mobile' : 'desktop';

    if (nextLayout === currentLayout) {
      return;
    }

    currentLayout = nextLayout;
    options[nextLayout]();
  };

  updateLayout();
  if (owner.isDestroyed()) {
    return noop;
  }

  const listenerController = createRealmAbortController(owner.unsafeElement);
  ownerWindow.addEventListener('resize', updateLayout, {
    signal: listenerController.signal,
  });
  const unregisterDestroy = owner.onDestroy(dispose);

  function dispose(): void {
    listenerController.abort();
    unregisterDestroy();
  }

  return dispose;
}

function bindContainerLayout(
  owner: GuiElement,
  options: ContainerResponsiveLayoutOptions,
): Unsubscribe {
  const observed = options.observe;
  if (observed.isDestroyed()) {
    throw new Error('Responsive layout container has been destroyed.');
  }
  if (owner.unsafeElement.ownerDocument !== observed.unsafeElement.ownerDocument) {
    throw new TypeError('Responsive layout owner and container must belong to the same document.');
  }

  validateBreakpoints(options.breakpoints);
  const ownerWindow = owner.unsafeElement.ownerDocument.defaultView;
  if (!ownerWindow) {
    throw new Error('Responsive layout requires a document with a window.');
  }
  const ResizeObserverConstructor = ownerWindow.ResizeObserver ?? globalThis.ResizeObserver;
  if (typeof ResizeObserverConstructor !== 'function') {
    throw new Error('Container responsive layout requires ResizeObserver.');
  }

  let currentBreakpointIndex: number | undefined;
  const updateLayout = (): void => {
    const bounds = observed.unsafeElement.getBoundingClientRect();
    const nextBreakpointIndex = options.breakpoints.findIndex(
      ({ maxWidth }) => maxWidth === undefined || bounds.width <= maxWidth,
    );

    if (nextBreakpointIndex === currentBreakpointIndex) {
      return;
    }

    const previousBreakpoint =
      currentBreakpointIndex === undefined
        ? undefined
        : options.breakpoints[currentBreakpointIndex];
    const breakpoint = options.breakpoints[nextBreakpointIndex]!;
    currentBreakpointIndex = nextBreakpointIndex;
    breakpoint.apply({
      width: bounds.width,
      height: bounds.height,
      breakpoint,
      previousBreakpoint,
    });
  };

  updateLayout();
  if (owner.isDestroyed() || observed.isDestroyed()) {
    return noop;
  }

  const observer = new ResizeObserverConstructor(updateLayout);
  observer.observe(observed.unsafeElement);
  const unregisterOwnerDestroy = owner.onDestroy(dispose);
  const unregisterContainerDestroy = observed === owner ? noop : observed.onDestroy(dispose);

  function dispose(): void {
    observer.disconnect();
    unregisterOwnerDestroy();
    unregisterContainerDestroy();
  }

  return dispose;
}

function validateBreakpoints(
  breakpoints: readonly [ResponsiveLayoutBreakpoint, ...ResponsiveLayoutBreakpoint[]],
): void {
  if (!Array.isArray(breakpoints) || breakpoints.length === 0) {
    throw new TypeError('Responsive layout breakpoints must be a non-empty array.');
  }

  for (const breakpoint of breakpoints) {
    if (
      typeof breakpoint !== 'object' ||
      breakpoint === null ||
      typeof breakpoint.apply !== 'function'
    ) {
      throw new TypeError('Each responsive layout breakpoint must provide an apply function.');
    }
  }

  const boundedBreakpoints = breakpoints.slice(0, -1);
  for (const breakpoint of boundedBreakpoints) {
    if (breakpoint.maxWidth === undefined) {
      throw new TypeError('Only the final responsive layout breakpoint may omit maxWidth.');
    }
    assertNonNegativeFinite(breakpoint.maxWidth, 'Responsive layout maxWidth');
  }

  if (breakpoints.at(-1)?.maxWidth !== undefined) {
    throw new TypeError('The final responsive layout breakpoint must omit maxWidth.');
  }

  const widths = boundedBreakpoints.map(({ maxWidth }) => maxWidth!);
  if (widths.some((width, index) => index > 0 && width <= widths[index - 1]!)) {
    throw new TypeError('Responsive layout maxWidth values must be strictly increasing.');
  }
}

const noop = (): void => undefined;
