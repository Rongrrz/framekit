import { createRealmAbortController } from '../core/dom/environment.js';
import { setStyle } from '../core/dom/styles.js';
import {
  color3FromRGB,
  createScreenGui,
  createTextLabel,
  createUICorner,
  udim2FromOffset,
  vector2,
  type GuiElement,
  type GuiObject,
  type TextLabelProperties,
  type Unsubscribe,
  type Vector2,
} from '../core/index.js';
import {
  assertAllowedValue,
  assertBoolean,
  assertNonNegativeFinite,
} from '../core/internal/validation.js';

/** Preferred side of the trigger or pointer; placement flips when the opposite side has more room. */
export type ToolTipPlacement = 'top' | 'bottom' | 'left' | 'right';

/** Appearance of generated text. Supply a GUI instance for custom layout and modifiers. */
export type ToolTipStyle = Partial<
  Pick<
    TextLabelProperties,
    | 'BackgroundColor3'
    | 'BackgroundTransparency'
    | 'TextColor3'
    | 'TextTransparency'
    | 'TextSize'
    | 'FontFamily'
    | 'FontWeight'
  >
>;

/** Placement and timing for text or custom tooltip content. */
export type ToolTipOptions = Readonly<{
  /** Tracks the pointer, fading out over 120 ms on exit. Focus anchors to the trigger. */
  followCursor?: boolean;
  /** Defaults to top for static tooltips and bottom for cursor-following tooltips. */
  placement?: ToolTipPlacement;
  /** Distance from the trigger or pointer in viewport pixels. Defaults to 12. */
  gap?: number;
  /** Hover delay in milliseconds. Focus opens immediately. Defaults to 300. */
  delay?: number;
  /** Initial properties for generated text; supplied instances retain their own appearance. */
  style?: ToolTipStyle;
}>;

const oppositeSide = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const;
const viewportMargin = 8;
const interactiveContent =
  'button, input, select, textarea, a[href], [tabindex], [contenteditable]:not([contenteditable="false"])';
let nextToolTipId = 0;

/**
 * Binds hover/focus content and returns an idempotent disposer. Escape dismisses until hover/focus ends.
 * Custom content must be detached, non-interactive, and in the trigger's document.
 * Its parent, position, anchor, and visibility are managed while bound and restored on disposal.
 * Generated content is destroyed on disposal; supplied instances remain caller-owned.
 *
 * @example
 * const dispose = fkh.withToolTip(button, 'Save your work', { followCursor: true });
 * const disposeCustom = fkh.withToolTip(button, tooltipFrame, { placement: 'right' });
 */
export const withToolTip = (
  target: GuiElement,
  content: string | GuiObject,
  options: ToolTipOptions = {},
): Unsubscribe => {
  if (target.isDestroyed()) throw new Error('ToolTip target has been destroyed.');
  const element = target.unsafeElement;
  const ownerDocument = element.ownerDocument;
  const ownerWindow = ownerDocument.defaultView;
  if (!ownerWindow) throw new Error('ToolTip requires a document with a window.');
  const followCursor = options.followCursor ?? false;
  const placement = options.placement ?? (followCursor ? 'bottom' : 'top');
  const gap = options.gap ?? 12;
  const delay = options.delay ?? 300;
  assertBoolean(followCursor, 'ToolTip followCursor');
  assertAllowedValue(placement, ['top', 'bottom', 'left', 'right'], 'ToolTip placement');
  assertNonNegativeFinite(gap, 'ToolTip gap');
  assertNonNegativeFinite(delay, 'ToolTip delay');
  if (typeof content !== 'string') {
    if (content.isDestroyed()) throw new Error('ToolTip content has been destroyed.');
    if (content === target || content.Parent || content.unsafeElement.isConnected) {
      throw new Error('ToolTip content must be detached.');
    }
    const customElement = content.unsafeElement;
    if (customElement.ownerDocument !== ownerDocument) {
      throw new TypeError('ToolTip content must belong to the target document.');
    }
    if (
      customElement.matches(interactiveContent) ||
      customElement.querySelector(interactiveContent)
    ) {
      throw new TypeError('ToolTip content must be non-interactive.');
    }
    if (customElement.id && ownerDocument.getElementById(customElement.id)) {
      throw new Error('ToolTip content must have a unique id.');
    }
  }

  const tooltip =
    typeof content === 'string'
      ? createTextToolTip(ownerDocument, content, options.style)
      : content;
  const tooltipElement = tooltip.unsafeElement;
  const original = {
    position: tooltip.Position,
    anchor: tooltip.AnchorPoint,
    visible: tooltip.Visible,
    id: tooltipElement.getAttribute('id'),
    role: tooltipElement.getAttribute('role'),
    pointerEvents: tooltipElement.style.pointerEvents,
  };
  const id = tooltipElement.id || createToolTipId(ownerDocument);
  const descriptionAlreadyPresent = (element.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .includes(id);
  const layer = createScreenGui(
    { Name: 'ToolTipLayer', Enabled: false, DisplayOrder: 2147483647 },
    { ownerDocument },
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
  tooltip.setProperties({
    Position: udim2FromOffset(0, 0),
    AnchorPoint: vector2(0, 0),
    Visible: true,
  });
  tooltipElement.id = id;
  tooltipElement.setAttribute('role', 'tooltip');
  tooltipElement.style.pointerEvents = followCursor ? 'none' : 'auto';
  tooltip.Parent = layer;
  // Modal dialogs make outside content inert, even when that content enters the top layer.
  layer.mount(element.closest('dialog') ?? ownerDocument.body ?? ownerDocument.documentElement);
  if (!descriptionAlreadyPresent) {
    element.setAttribute(
      'aria-describedby',
      [element.getAttribute('aria-describedby'), id].filter(Boolean).join(' '),
    );
  }

  const controller = createRealmAbortController(element);
  const listenerOptions = { signal: controller.signal };
  let disposed = false;
  let hovered = false;
  let tooltipHovered = false;
  let focused = element.contains(ownerDocument.activeElement);
  let dismissed = false;
  let pointer: Vector2 | undefined;
  let timer: number | undefined;
  let frame: number | undefined;
  let fadeStarted: number | undefined;

  const hide = (): void => {
    ownerWindow.clearTimeout(timer);
    timer = undefined;
    if (frame !== undefined) ownerWindow.cancelAnimationFrame(frame);
    frame = undefined;
    fadeStarted = undefined;
    setStyle(layerElement, 'opacity', '1');
    if (layer.isDestroyed() || !layer.Enabled) return;
    if (supportsPopover) layerElement.hidePopover();
    layer.Enabled = false;
    tooltipHovered = false;
  };

  const position = (): boolean => {
    const bounds = element.getBoundingClientRect();
    if (!element.isConnected || (bounds.width === 0 && bounds.height === 0)) {
      hide();
      hovered = focused = false;
      return false;
    }
    const tooltipBounds = tooltipElement.getBoundingClientRect();
    const anchor =
      followCursor && !focused && pointer
        ? { left: pointer.X, right: pointer.X, top: pointer.Y, bottom: pointer.Y }
        : bounds;
    const point = toolTipPosition(
      anchor,
      tooltipBounds,
      placement,
      gap,
      ownerDocument.documentElement.clientWidth || ownerWindow.innerWidth,
      ownerDocument.documentElement.clientHeight || ownerWindow.innerHeight,
    );
    const x = tooltip.Position.X.Offset + point.X - tooltipBounds.left;
    const y = tooltip.Position.Y.Offset + point.Y - tooltipBounds.top;
    if (x !== tooltip.Position.X.Offset || y !== tooltip.Position.Y.Offset) {
      tooltip.Position = udim2FromOffset(x, y);
    }
    return !disposed && layer.Enabled;
  };

  // Sample geometry only while open so scrolling and animated/scaled triggers stay anchored.
  const track = (): void => {
    frame = undefined;
    if (disposed || !layer.Enabled) return;
    if (fadeStarted !== undefined) {
      const opacity = Math.max(0, 1 - (ownerWindow.performance.now() - fadeStarted) / 120);
      if (opacity === 0) {
        hide();
        return;
      }
      setStyle(layerElement, 'opacity', String(opacity));
    } else if (!position()) return;
    frame = ownerWindow.requestAnimationFrame(track);
  };
  const show = (): void => {
    timer = undefined;
    if (disposed || dismissed || !(hovered || tooltipHovered || focused)) return;
    layer.Enabled = true;
    if (supportsPopover) layerElement.showPopover();
    if (position()) frame = ownerWindow.requestAnimationFrame(track);
  };
  const update = (): void => {
    ownerWindow.clearTimeout(timer);
    timer = undefined;
    if ((hovered || tooltipHovered || focused) && !dismissed) {
      fadeStarted = undefined;
      setStyle(layerElement, 'opacity', '1');
      if (layer.Enabled) position();
      else if (focused || delay === 0) show();
      else timer = ownerWindow.setTimeout(show, delay);
      return;
    }
    if (!(hovered || tooltipHovered || focused)) dismissed = false;
    if (!layer.Enabled) return;
    if (followCursor) fadeStarted ??= ownerWindow.performance.now();
    // Let the pointer cross the gap into a static tooltip without flicker.
    else timer = ownerWindow.setTimeout(hide, 80);
  };

  element.addEventListener(
    'pointerenter',
    (event) => {
      if (event.pointerType === 'touch') return;
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
  element.addEventListener(
    'focusout',
    (event) => {
      focused =
        event.relatedTarget instanceof ownerWindow.Node && element.contains(event.relatedTarget);
      update();
    },
    listenerOptions,
  );
  tooltipElement.addEventListener(
    'pointerenter',
    () => {
      if (followCursor) return;
      tooltipHovered = true;
      update();
    },
    listenerOptions,
  );
  tooltipElement.addEventListener(
    'pointerleave',
    () => {
      if (followCursor) return;
      tooltipHovered = false;
      update();
    },
    listenerOptions,
  );
  ownerDocument.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || !(hovered || tooltipHovered || focused)) return;
      dismissed = true;
      hide();
    },
    listenerOptions,
  );

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    hide();
    controller.abort();
    unregisterTargetDestroy();
    unregisterTooltipDestroy();
    if (!descriptionAlreadyPresent) {
      const remaining = (element.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .filter((token) => token && token !== id);
      if (remaining.length) element.setAttribute('aria-describedby', remaining.join(' '));
      else element.removeAttribute('aria-describedby');
    }
    if (!tooltip.isDestroyed()) {
      tooltip.Parent = undefined;
      if (typeof content === 'string') tooltip.destroy();
      else {
        tooltip.setProperties({
          Position: original.position,
          AnchorPoint: original.anchor,
          Visible: original.visible,
        });
        restoreAttribute(tooltipElement, 'id', original.id);
        restoreAttribute(tooltipElement, 'role', original.role);
        tooltipElement.style.pointerEvents = original.pointerEvents;
      }
    }
    layer.destroy();
  };
  const unregisterTargetDestroy = target.onDestroy(dispose);
  const unregisterTooltipDestroy = tooltip.onDestroy(dispose);
  if (focused) update();
  return dispose;
};

const createToolTipId = (ownerDocument: Document): string => {
  nextToolTipId += 1;
  const id = `framekit-tooltip-${nextToolTipId}`;
  return ownerDocument.getElementById(id) ? createToolTipId(ownerDocument) : id;
};
const restoreAttribute = (element: HTMLElement, name: string, value: string | null): void => {
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
};
const createTextToolTip = (
  ownerDocument: Document,
  text: string,
  style?: ToolTipStyle,
): GuiObject => {
  const tooltip = createTextLabel(
    {
      Name: 'ToolTip',
      Text: text,
      AutomaticSize: 'XY',
      TextWrapped: true,
      TextXAlignment: 'Left',
      TextYAlignment: 'Top',
      BackgroundColor3: color3FromRGB(32, 36, 44),
      TextColor3: color3FromRGB(255, 255, 255),
      ...style,
    },
    { ownerDocument },
  );
  const textElement = tooltip.unsafeElement.querySelector<HTMLElement>('[data-framekit-text]')!;
  // Natural text flow gives the generated bubble intrinsic size, wrapping, and padding.
  for (const [property, value] of Object.entries({
    position: 'static',
    inset: 'auto',
    display: 'block',
    padding: '8px 10px',
    'overflow-wrap': 'anywhere',
  }))
    setStyle(textElement, property, value);
  setStyle(tooltip.unsafeElement, 'max-width', 'min(320px, calc(100vw - 16px))');
  setStyle(tooltip.unsafeElement, 'max-height', 'calc(100vh - 16px)');
  setStyle(tooltip.unsafeElement, 'overflow', 'auto');
  createUICorner({ CornerRadius: 6 }).Parent = tooltip;
  return tooltip;
};

type AnchorBounds = Readonly<{ left: number; right: number; top: number; bottom: number }>;

const toolTipPosition = (
  anchor: AnchorBounds,
  size: Readonly<{ width: number; height: number }>,
  preferredSide: ToolTipPlacement,
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
