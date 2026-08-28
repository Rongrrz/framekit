import { cancelAnimationProperties } from '../runtime/animation-ownership';
import { addCleanup } from '../runtime/node-lifecycle';
import { applyPropertyPatch, getPropertiesSnapshot } from '../runtime/node-properties';
import type { GuiNode } from '../runtime/render';
import { assertAllowedValue } from '../runtime/validation';
import { assertVector2, vector2, type Vector2 } from '../values/vector2';
import { createDefaultFrameProperties, createFrameBasedNode, type FrameProperties } from './frame';

/** Axes on which a scrolling frame accepts native scrolling. */
export type ScrollingDirection = 'X' | 'Y' | 'XY';

/** Frame properties plus controlled scroll position and direction. */
export type ScrollingFrameProperties = FrameProperties & {
  /** Axes that accept native scrolling. */
  ScrollingDirection: ScrollingDirection;
  /** Current scroll offset in pixels. Assigning it scrolls immediately. */
  CanvasPosition: Vector2;
};

/** A native scrolling container synchronized through CanvasPosition. */
export type ScrollingFrameNode = GuiNode<ScrollingFrameProperties>;

const scrollingDirections: readonly ScrollingDirection[] = ['X', 'Y', 'XY'];
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

/** Creates a native scrolling container with an animatable CanvasPosition. */
export function createScrollingFrame(
  initial: Partial<ScrollingFrameProperties> = {},
): ScrollingFrameNode {
  const element = document.createElement('div');
  element.style.overscrollBehavior = 'contain';
  element.tabIndex = 0;
  // Scroll events do not identify whether the browser or FrameKit moved the element. Remember the
  // position accepted by the browser after each FrameKit write so those events can be ignored.
  let lastRenderedCanvasPosition = readCanvasPosition(element);
  const node = createFrameBasedNode<ScrollingFrameProperties>(
    'ScrollingFrame',
    element,
    {
      ...createDefaultFrameProperties(),
      Name: 'ScrollingFrame',
      ScrollingDirection: 'XY',
      CanvasPosition: vector2(0, 0),
    },
    initial,
    (current, changed) => {
      assertAllowedValue(current.ScrollingDirection, scrollingDirections, 'ScrollingDirection');
      assertVector2(current.CanvasPosition, 'CanvasPosition');

      const scrollX = current.ScrollingDirection === 'X' || current.ScrollingDirection === 'XY';
      const scrollY = current.ScrollingDirection === 'Y' || current.ScrollingDirection === 'XY';
      element.style.overflowX = scrollX ? 'auto' : 'hidden';
      element.style.overflowY = scrollY ? 'auto' : 'hidden';
      if (changed.has('CanvasPosition')) {
        if (!positionsMatch(readCanvasPosition(element), current.CanvasPosition)) {
          writeCanvasPosition(element, current.CanvasPosition);
        }
        lastRenderedCanvasPosition = readCanvasPosition(element);
      }
    },
  ) as ScrollingFrameNode;

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
