import { createRealmAbortController } from '#internal/dom/environment.js';
import * as lifecycle from '#internal/runtime/systems/lifecycle.js';
import { vector2 } from '#values/vector2.js';

import type { ScrollingFrame } from '../scrolling-frame.js';

type ScrollAxis = 'X' | 'Y';
type KeyboardScrollIntent = Readonly<{
  axis: ScrollAxis;
  direction: -1 | 1;
  distance: 'Line' | 'Page';
}>;

/** Forwards unsupported keyboard axes to the nearest scrolling ancestor that accepts them. */
export const connectKeyboardScrolling = (node: ScrollingFrame): void => {
  const listeners = createRealmAbortController(node.unsafeElement);
  node.unsafeElement.addEventListener(
    'keydown',
    (event) => forwardUnsupportedKeyboardScroll(node, event),
    { signal: listeners.signal },
  );
  lifecycle.onDestroy(node, () => listeners.abort());
};

const forwardUnsupportedKeyboardScroll = (node: ScrollingFrame, event: KeyboardEvent): void => {
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
};

const resolveKeyboardScrollIntent = (event: KeyboardEvent): KeyboardScrollIntent | undefined => {
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
};

const findScrollingAncestor = (
  node: ScrollingFrame,
  axis: ScrollAxis,
): ScrollingFrame | undefined => findScrollingAncestorFrom(node.Parent, axis);

const findScrollingAncestorFrom = (
  node: ScrollingFrame['Parent'],
  axis: ScrollAxis,
): ScrollingFrame | undefined => {
  if (!node) {
    return undefined;
  }
  if (node.isA('ScrollingFrame') && acceptsScrollAxis(node, axis)) {
    return node;
  }
  return findScrollingAncestorFrom(node.Parent, axis);
};

const acceptsScrollAxis = (node: ScrollingFrame, axis: ScrollAxis): boolean => {
  if (!node.ScrollingEnabled) {
    return false;
  }
  return node.ScrollingDirection === axis || node.ScrollingDirection === 'XY';
};
