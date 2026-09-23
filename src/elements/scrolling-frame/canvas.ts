import { createRealmAbortController } from '#internal/dom/environment.js';
import * as lifecycle from '#internal/runtime/systems/lifecycle.js';
import { getNodeProperty, setNodeProperties } from '#internal/runtime/systems/properties.js';
import { vector2, type Vector2 } from '#values/vector2.js';

import type { AutomaticSize } from '../gui-object.js';
import type { ScrollingFrame } from '../scrolling-frame.js';

export type CanvasPositionSync = Readonly<{
  render(position: Vector2): Vector2 | undefined;
  connect(node: ScrollingFrame): void;
}>;

/** Keeps the browser's native scroll offset and FrameKit's CanvasPosition in sync. */
export const createCanvasPositionSync = (element: HTMLElement): CanvasPositionSync => {
  // Native scroll events do not identify who moved the element, so remember the last accepted
  // FrameKit write and ignore its matching browser event.
  let lastRenderedPosition = readCanvasPosition(element);

  const render = (position: Vector2): Vector2 | undefined => {
    if (!positionsMatch(readCanvasPosition(element), position)) {
      writeCanvasPosition(element, position);
    }
    lastRenderedPosition = readCanvasPosition(element);
    return positionsMatch(lastRenderedPosition, position) ? undefined : lastRenderedPosition;
  };

  const connect = (node: ScrollingFrame): void => {
    const listeners = createRealmAbortController(element);
    element.addEventListener(
      'scroll',
      () => {
        const browserPosition = readCanvasPosition(element);
        if (
          positionsMatch(browserPosition, lastRenderedPosition) &&
          positionsMatch(browserPosition, getNodeProperty(node, 'CanvasPosition'))
        ) {
          return;
        }
        const canvasPosition = getNodeProperty(node, 'CanvasPosition');
        if (positionsMatch(browserPosition, canvasPosition)) {
          lastRenderedPosition = browserPosition;
          return;
        }
        setNodeProperties(node, { CanvasPosition: browserPosition });
      },
      { passive: true, signal: listeners.signal },
    );
    lifecycle.onDestroy(node, () => listeners.abort());
  };

  return Object.freeze({ render, connect });
};

export const isCanvasAxisAutomatic = (size: AutomaticSize, axis: 'X' | 'Y'): boolean =>
  size === axis || size === 'XY';

export const resolveScrollbarWidth = (thickness: number): string => {
  if (thickness === 0) {
    return 'none';
  }
  if (thickness <= 8) {
    return 'thin';
  }
  return 'auto';
};

const readCanvasPosition = (element: HTMLElement): Vector2 =>
  vector2(element.scrollLeft, element.scrollTop);

const writeCanvasPosition = (element: HTMLElement, position: Vector2): void => {
  if (typeof element.scrollTo === 'function') {
    element.scrollTo(position.X, position.Y);
    return;
  }
  element.scrollLeft = position.X;
  element.scrollTop = position.Y;
};

const positionsMatch = (first: Vector2, second: Vector2): boolean =>
  first.X === second.X && first.Y === second.Y;
