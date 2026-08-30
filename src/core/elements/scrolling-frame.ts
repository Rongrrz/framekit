import { cancelAnimationProperties } from '../../shared/runtime/animation-ownership';
import { guiEventMethods } from '../../shared/runtime/gui-events';
import { addCleanup } from '../../shared/runtime/node-lifecycle';
import { applyPropertyPatch, getPropertiesSnapshot } from '../../shared/runtime/node-properties';
import { getActiveNodeState } from '../../shared/runtime/node-state';
import type { GuiElement } from '../../shared/runtime/render';
import {
  assertAllowedValue,
  assertBoolean,
  assertNonNegativeFinite,
} from '../../shared/runtime/validation';
import {
  type AutomaticSize,
  createDefaultGuiObjectProperties,
  createGuiObjectNode,
  type GuiObjectProperties,
} from '../gui-object';
import { assertUDim2, udim2FromOffset, udimToCss, type UDim2 } from '../values/udim';
import { assertVector2, vector2, type Vector2 } from '../values/vector2';

/** Axes on which a scrolling frame accepts native scrolling. */
export type ScrollingDirection = 'X' | 'Y' | 'XY';

/** Frame properties plus controlled scroll position and direction. */
export type ScrollingFrameProperties = GuiObjectProperties & {
  /** Axes that accept native scrolling. */
  ScrollingDirection: ScrollingDirection;
  /** Current scroll offset in pixels. Assigning it scrolls immediately. */
  CanvasPosition: Vector2;
  /** Width and height of the scrollable canvas. */
  CanvasSize: UDim2;
  /** Axes that grow to contain rendered descendants. */
  AutomaticCanvasSize: AutomaticSize;
  /** Whether mouse, touch, and keyboard scrolling is enabled. */
  ScrollingEnabled: boolean;
  /** Native scrollbar thickness in pixels. */
  ScrollBarThickness: number;
};

/** Scrolling operations and browser-computed canvas geometry. */
export type ScrollingFrameMethods = {
  /** Current scrollable content width and height in pixels. */
  readonly AbsoluteCanvasSize: Vector2;
  /** Largest currently reachable CanvasPosition. */
  readonly MaxCanvasPosition: Vector2;
  /** Moves to an absolute canvas position. */
  scrollTo(position: Vector2): void;
  /** Moves relative to the current canvas position. */
  scrollBy(offset: Vector2): void;
};

/** A native scrolling container synchronized through CanvasPosition. */
export type ScrollingFrame = GuiElement<ScrollingFrameProperties> & ScrollingFrameMethods;

const scrollingDirections: readonly ScrollingDirection[] = ['X', 'Y', 'XY'];
const automaticCanvasSizes: readonly AutomaticSize[] = ['None', 'X', 'Y', 'XY'];
const keyboardScrollKeys = new Set([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
  ' ',
]);
const canvasPositionProperty = ['CanvasPosition'] as const;
const documentsWithScrollbarStyles = new WeakSet<Document>();

const scrollingFrameMethodTable = {
  ...guiEventMethods,
  scrollTo(this: ScrollingFrame, position: Vector2): void {
    getActiveNodeState(this);
    assertVector2(position, 'position');
    this.CanvasPosition = position;
  },
  scrollBy(this: ScrollingFrame, offset: Vector2): void {
    getActiveNodeState(this);
    assertVector2(offset, 'offset');
    this.CanvasPosition = vector2(
      this.CanvasPosition.X + offset.X,
      this.CanvasPosition.Y + offset.Y,
    );
  },
};

Object.defineProperties(scrollingFrameMethodTable, {
  AbsoluteCanvasSize: {
    get(this: ScrollingFrame): Vector2 {
      getActiveNodeState(this);
      return vector2(this.element.scrollWidth, this.element.scrollHeight);
    },
  },
  MaxCanvasPosition: {
    get(this: ScrollingFrame): Vector2 {
      getActiveNodeState(this);
      return vector2(
        Math.max(0, this.element.scrollWidth - this.element.clientWidth),
        Math.max(0, this.element.scrollHeight - this.element.clientHeight),
      );
    },
  },
});

const scrollingFrameMethods = Object.freeze(scrollingFrameMethodTable);

/** Creates a native scrolling container with an animatable CanvasPosition. */
export function createScrollingFrame(
  initial: Partial<ScrollingFrameProperties> = {},
): ScrollingFrame {
  const element = document.createElement('div');
  const canvasBounds = document.createElement('div');

  canvasBounds.dataset.framekitCanvasBounds = '';
  canvasBounds.setAttribute('aria-hidden', 'true');
  Object.assign(canvasBounds.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    pointerEvents: 'none',
    visibility: 'hidden',
  });
  element.append(canvasBounds);
  element.style.overscrollBehavior = 'contain';
  element.tabIndex = 0;
  ensureScrollbarStyles(document);
  // Scroll events do not identify whether the browser or FrameKit moved the element. Remember the
  // position accepted by the browser after each FrameKit write so those events can be ignored.
  let lastRenderedCanvasPosition = readCanvasPosition(element);
  const node = createGuiObjectNode<ScrollingFrameProperties>(
    'ScrollingFrame',
    element,
    {
      ...createDefaultGuiObjectProperties(),
      Name: 'ScrollingFrame',
      ScrollingDirection: 'XY',
      CanvasPosition: vector2(0, 0),
      CanvasSize: udim2FromOffset(0, 0),
      AutomaticCanvasSize: 'None',
      ScrollingEnabled: true,
      ScrollBarThickness: 12,
    },
    initial,
    (current, changed) => {
      const scrollX = current.ScrollingDirection === 'X' || current.ScrollingDirection === 'XY';
      const scrollY = current.ScrollingDirection === 'Y' || current.ScrollingDirection === 'XY';
      element.style.overflowX = current.ScrollingEnabled && scrollX ? 'auto' : 'hidden';
      element.style.overflowY = current.ScrollingEnabled && scrollY ? 'auto' : 'hidden';
      element.style.setProperty(
        '--framekit-scrollbar-thickness',
        `${current.ScrollBarThickness}px`,
      );
      element.style.setProperty(
        'scrollbar-width',
        current.ScrollBarThickness === 0
          ? 'none'
          : current.ScrollBarThickness <= 8
            ? 'thin'
            : 'auto',
      );
      canvasBounds.style.width = isCanvasAxisAutomatic(current.AutomaticCanvasSize, 'X')
        ? '0px'
        : udimToCss(current.CanvasSize.X);
      canvasBounds.style.height = isCanvasAxisAutomatic(current.AutomaticCanvasSize, 'Y')
        ? '0px'
        : udimToCss(current.CanvasSize.Y);
      if (changed.has('CanvasPosition')) {
        if (!positionsMatch(readCanvasPosition(element), current.CanvasPosition)) {
          writeCanvasPosition(element, current.CanvasPosition);
        }
        lastRenderedCanvasPosition = readCanvasPosition(element);
      }
    },
    scrollingFrameMethods,
    validateScrollingFrameProperties,
  ) as ScrollingFrame;

  const syncCanvasPositionFromBrowser = (): void => {
    const browserPosition = readCanvasPosition(element);
    if (positionsMatch(browserPosition, lastRenderedCanvasPosition)) return;
    const current = getPropertiesSnapshot(node).CanvasPosition;
    if (positionsMatch(browserPosition, current)) {
      lastRenderedCanvasPosition = browserPosition;
      return;
    }
    cancelAnimationProperties(node, canvasPositionProperty);
    applyPropertyPatch(node, { CanvasPosition: browserPosition });
  };

  const stopCanvasPositionAnimation = (): void => {
    cancelAnimationProperties(node, canvasPositionProperty);
  };

  const stopAnimationForScrollKey = (event: KeyboardEvent): void => {
    if (keyboardScrollKeys.has(event.key)) stopCanvasPositionAnimation();
  };

  const listenerController = new AbortController();
  const passiveListenerOptions = { passive: true, signal: listenerController.signal };
  element.addEventListener('scroll', syncCanvasPositionFromBrowser, passiveListenerOptions);
  element.addEventListener('wheel', stopCanvasPositionAnimation, passiveListenerOptions);
  element.addEventListener('touchstart', stopCanvasPositionAnimation, passiveListenerOptions);
  element.addEventListener('touchmove', stopCanvasPositionAnimation, passiveListenerOptions);
  element.addEventListener('keydown', stopAnimationForScrollKey, {
    signal: listenerController.signal,
  });

  addCleanup(node, () => listenerController.abort());
  return node;
}

function validateScrollingFrameProperties(properties: Readonly<ScrollingFrameProperties>): void {
  assertAllowedValue(properties.ScrollingDirection, scrollingDirections, 'ScrollingDirection');
  assertVector2(properties.CanvasPosition, 'CanvasPosition');
  assertUDim2(properties.CanvasSize, 'CanvasSize');
  assertAllowedValue(properties.AutomaticCanvasSize, automaticCanvasSizes, 'AutomaticCanvasSize');
  assertBoolean(properties.ScrollingEnabled, 'ScrollingEnabled');
  assertNonNegativeFinite(properties.ScrollBarThickness, 'ScrollBarThickness');
}

function isCanvasAxisAutomatic(size: AutomaticSize, axis: 'X' | 'Y'): boolean {
  return size === axis || size === 'XY';
}

function ensureScrollbarStyles(ownerDocument: Document): void {
  if (documentsWithScrollbarStyles.has(ownerDocument)) return;
  const style = ownerDocument.createElement('style');
  style.dataset.framekitScrollbarStyles = '';
  style.textContent = `
    [data-framekit="ScrollingFrame"]::-webkit-scrollbar {
      width: var(--framekit-scrollbar-thickness);
      height: var(--framekit-scrollbar-thickness);
    }
  `;
  ownerDocument.head.append(style);
  documentsWithScrollbarStyles.add(ownerDocument);
}

function readCanvasPosition(element: HTMLElement): Vector2 {
  return vector2(element.scrollLeft, element.scrollTop);
}

function writeCanvasPosition(element: HTMLElement, position: Vector2): void {
  if (typeof element.scrollTo === 'function') {
    element.scrollTo(position.X, position.Y);
    return;
  }
  element.scrollLeft = position.X;
  element.scrollTop = position.Y;
}

function positionsMatch(first: Vector2, second: Vector2): boolean {
  return first.X === second.X && first.Y === second.Y;
}
