import {
  createRealmAbortController,
  resolveOwnerDocument,
  type DomOptions,
} from '../dom/environment.js';
import { setStyle } from '../dom/styles.js';
import { installFrameKitStyles } from '../dom/stylesheet.js';
import {
  assertAllowedValue,
  assertBoolean,
  assertNonNegativeFinite,
  assertUnitInterval,
} from '../internal/validation.js';
import { guiEventMethods } from '../runtime/node/gui-events.js';
import type { GuiElement } from '../runtime/node/gui-node.js';
import { getActiveNodeState } from '../runtime/node/registry.js';
import * as lifecycle from '../runtime/services/lifecycle.js';
import { setNodeProperties, getNodeProperty } from '../runtime/services/properties.js';
import { assertColor3, color3FromRGB, color3ToCss, type Color3 } from '../values/color3.js';
import { assertUDim2, udim2FromOffset, udimToCss, type UDim2 } from '../values/udim.js';
import { assertVector2, vector2, type Vector2 } from '../values/vector2.js';
import {
  type AutomaticSize,
  createDefaultGuiObjectProperties,
  createGuiObjectNode,
  type GuiObjectProperties,
} from './gui-object.js';

/** Axes on which a scrolling frame accepts native scrolling. */
export type ScrollingDirection = 'X' | 'Y' | 'XY';

/** Semantic HTML elements that can provide a scrolling region. */
export type ScrollingFrameTagName = (typeof scrollingFrameTagNames)[number];

/** Creation-only options for a scrolling frame's native element. */
export type ScrollingFrameOptions = Readonly<DomOptions & { tagName?: ScrollingFrameTagName }>;

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
  /** Native scrollbar thumb color. */
  ScrollBarImageColor3: Color3;
  /** Native scrollbar thumb transparency from 0 (opaque) to 1 (invisible). */
  ScrollBarImageTransparency: number;
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
export type ScrollingFrame = GuiElement<ScrollingFrameProperties> &
  ScrollingFrameMethods & {
    readonly unsafeElement: HTMLElementTagNameMap[ScrollingFrameTagName];
  };

const scrollingDirections: readonly ScrollingDirection[] = ['X', 'Y', 'XY'];
const automaticCanvasSizes: readonly AutomaticSize[] = ['None', 'X', 'Y', 'XY'];
const scrollingFrameTagNames = ['div', 'main', 'section', 'article', 'aside', 'nav'] as const;
type ScrollAxis = 'X' | 'Y';
type KeyboardScrollIntent = Readonly<{
  axis: ScrollAxis;
  direction: -1 | 1;
  distance: 'Line' | 'Page';
}>;

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
      return vector2(this.unsafeElement.scrollWidth, this.unsafeElement.scrollHeight);
    },
  },
  MaxCanvasPosition: {
    get(this: ScrollingFrame): Vector2 {
      getActiveNodeState(this);
      return vector2(
        Math.max(0, this.unsafeElement.scrollWidth - this.unsafeElement.clientWidth),
        Math.max(0, this.unsafeElement.scrollHeight - this.unsafeElement.clientHeight),
      );
    },
  },
});

const scrollingFrameMethods = Object.freeze(scrollingFrameMethodTable);

/** Creates a native scrolling container with an animatable CanvasPosition. */
export function createScrollingFrame(
  initialProperties: Partial<ScrollingFrameProperties> = {},
  options: ScrollingFrameOptions = {},
): ScrollingFrame {
  const tagName = options.tagName ?? 'div';
  assertAllowedValue(tagName, scrollingFrameTagNames, 'ScrollingFrame tagName');
  const ownerDocument = resolveOwnerDocument(options);
  const element = ownerDocument.createElement(tagName);
  const canvasBounds = ownerDocument.createElement('div');

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
  element.tabIndex = 0;
  installFrameKitStyles({ ownerDocument });
  // Scroll events do not identify whether the browser or FrameKit moved the element. Remember the
  // position accepted by the browser after each FrameKit write so those events can be ignored.
  let lastRenderedCanvasPosition = readCanvasPosition(element);
  const node = createGuiObjectNode<ScrollingFrameProperties>({
    className: 'ScrollingFrame',
    element,
    defaultProperties: {
      ...createDefaultGuiObjectProperties(),
      Name: 'ScrollingFrame',
      ScrollingDirection: 'XY',
      CanvasPosition: vector2(0, 0),
      CanvasSize: udim2FromOffset(0, 0),
      AutomaticCanvasSize: 'None',
      ScrollingEnabled: true,
      ScrollBarImageColor3: color3FromRGB(0, 0, 0),
      ScrollBarImageTransparency: 0,
      ScrollBarThickness: 12,
    },
    initialProperties,
    renderProperties: (properties, changedProperties) => {
      if (
        changedProperties.has('ScrollingDirection') ||
        changedProperties.has('ScrollingEnabled')
      ) {
        const scrollX =
          properties.ScrollingDirection === 'X' || properties.ScrollingDirection === 'XY';
        const scrollY =
          properties.ScrollingDirection === 'Y' || properties.ScrollingDirection === 'XY';
        setStyle(element, 'overflow-x', properties.ScrollingEnabled && scrollX ? 'auto' : 'hidden');
        setStyle(element, 'overflow-y', properties.ScrollingEnabled && scrollY ? 'auto' : 'hidden');
        setStyle(
          element,
          'overscroll-behavior-x',
          properties.ScrollingEnabled && scrollX ? 'none' : 'auto',
        );
        setStyle(
          element,
          'overscroll-behavior-y',
          properties.ScrollingEnabled && scrollY ? 'none' : 'auto',
        );
      }
      if (changedProperties.has('ScrollBarThickness')) {
        setStyle(element, '--framekit-scrollbar-thickness', `${properties.ScrollBarThickness}px`);
        setStyle(element, 'scrollbar-width', resolveScrollbarWidth(properties.ScrollBarThickness));
      }
      if (
        changedProperties.has('ScrollBarImageColor3') ||
        changedProperties.has('ScrollBarImageTransparency')
      ) {
        setStyle(
          element,
          '--framekit-scrollbar-color',
          color3ToCss(properties.ScrollBarImageColor3, properties.ScrollBarImageTransparency),
        );
      }
      if (changedProperties.has('CanvasSize') || changedProperties.has('AutomaticCanvasSize')) {
        setStyle(
          canvasBounds,
          'width',
          isCanvasAxisAutomatic(properties.AutomaticCanvasSize, 'X')
            ? '0px'
            : udimToCss(properties.CanvasSize.X),
        );
        setStyle(
          canvasBounds,
          'height',
          isCanvasAxisAutomatic(properties.AutomaticCanvasSize, 'Y')
            ? '0px'
            : udimToCss(properties.CanvasSize.Y),
        );
      }
      if (changedProperties.has('CanvasPosition')) {
        if (!positionsMatch(readCanvasPosition(element), properties.CanvasPosition)) {
          writeCanvasPosition(element, properties.CanvasPosition);
        }
        lastRenderedCanvasPosition = readCanvasPosition(element);
        if (!positionsMatch(lastRenderedCanvasPosition, properties.CanvasPosition)) {
          return { CanvasPosition: lastRenderedCanvasPosition };
        }
      }
    },
    methods: scrollingFrameMethods,
    validateProperties: validateScrollingFrameProperties,
  }) as ScrollingFrame;

  const syncCanvasPositionFromBrowser = (): void => {
    const browserPosition = readCanvasPosition(element);
    if (
      positionsMatch(browserPosition, lastRenderedCanvasPosition) &&
      positionsMatch(browserPosition, getNodeProperty(node, 'CanvasPosition'))
    ) {
      return;
    }
    const canvasPosition = getNodeProperty(node, 'CanvasPosition');
    if (positionsMatch(browserPosition, canvasPosition)) {
      lastRenderedCanvasPosition = browserPosition;
      return;
    }
    setNodeProperties(node, { CanvasPosition: browserPosition });
  };

  const listenerController = createRealmAbortController(element);
  const passiveListenerOptions = { passive: true, signal: listenerController.signal };
  const listenerElement: HTMLElement = element;
  listenerElement.addEventListener('scroll', syncCanvasPositionFromBrowser, passiveListenerOptions);
  listenerElement.addEventListener(
    'keydown',
    (event: KeyboardEvent) => forwardUnsupportedKeyboardScroll(node, event),
    { signal: listenerController.signal },
  );

  lifecycle.onDestroy(node, () => listenerController.abort());
  return node;
}

function validateScrollingFrameProperties(properties: Readonly<ScrollingFrameProperties>): void {
  assertAllowedValue(properties.ScrollingDirection, scrollingDirections, 'ScrollingDirection');
  assertVector2(properties.CanvasPosition, 'CanvasPosition');
  assertUDim2(properties.CanvasSize, 'CanvasSize');
  assertAllowedValue(properties.AutomaticCanvasSize, automaticCanvasSizes, 'AutomaticCanvasSize');
  assertBoolean(properties.ScrollingEnabled, 'ScrollingEnabled');
  assertColor3(properties.ScrollBarImageColor3, 'ScrollBarImageColor3');
  assertUnitInterval(properties.ScrollBarImageTransparency, 'ScrollBarImageTransparency');
  assertNonNegativeFinite(properties.ScrollBarThickness, 'ScrollBarThickness');
}

function isCanvasAxisAutomatic(size: AutomaticSize, axis: 'X' | 'Y'): boolean {
  return size === axis || size === 'XY';
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

function forwardUnsupportedKeyboardScroll(node: ScrollingFrame, event: KeyboardEvent): void {
  if (
    event.target !== node.unsafeElement ||
    event.defaultPrevented ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return;
  }
  const intent = resolveKeyboardScrollIntent(event);
  if (!intent || acceptsScrollAxis(node, intent.axis)) {
    return;
  }
  const ancestor = findScrollingAncestor(node, intent.axis);
  if (!ancestor) {
    return;
  }

  const distance =
    intent.distance === 'Line'
      ? 40
      : intent.axis === 'X'
        ? ancestor.unsafeElement.clientWidth
        : ancestor.unsafeElement.clientHeight;
  const offset = intent.direction * distance;
  event.preventDefault();
  ancestor.scrollBy(intent.axis === 'X' ? vector2(offset, 0) : vector2(0, offset));
}

function resolveKeyboardScrollIntent(event: KeyboardEvent): KeyboardScrollIntent | undefined {
  switch (event.key) {
    case 'ArrowLeft':
      return { axis: 'X', direction: -1, distance: 'Line' };
    case 'ArrowRight':
      return { axis: 'X', direction: 1, distance: 'Line' };
    case 'ArrowUp':
      return { axis: 'Y', direction: -1, distance: 'Line' };
    case 'ArrowDown':
      return { axis: 'Y', direction: 1, distance: 'Line' };
    case 'PageUp':
      return { axis: 'Y', direction: -1, distance: 'Page' };
    case 'PageDown':
      return { axis: 'Y', direction: 1, distance: 'Page' };
    case ' ':
      return { axis: 'Y', direction: event.shiftKey ? -1 : 1, distance: 'Page' };
    default:
      return undefined;
  }
}

function findScrollingAncestor(node: ScrollingFrame, axis: ScrollAxis): ScrollingFrame | undefined {
  return findScrollingAncestorFrom(node.Parent, axis);
}

function findScrollingAncestorFrom(
  node: ScrollingFrame['Parent'],
  axis: ScrollAxis,
): ScrollingFrame | undefined {
  if (!node) {
    return undefined;
  }
  if (node.isA('ScrollingFrame') && acceptsScrollAxis(node, axis)) {
    return node;
  }
  return findScrollingAncestorFrom(node.Parent, axis);
}

function acceptsScrollAxis(node: ScrollingFrame, axis: ScrollAxis): boolean {
  if (!node.ScrollingEnabled) {
    return false;
  }
  return node.ScrollingDirection === axis || node.ScrollingDirection === 'XY';
}

function resolveScrollbarWidth(thickness: number): string {
  if (thickness === 0) {
    return 'none';
  }
  if (thickness <= 8) {
    return 'thin';
  }
  return 'auto';
}
