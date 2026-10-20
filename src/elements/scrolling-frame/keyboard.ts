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

/** Scrolls focused regions consistently and forwards unsupported axes to a scrolling ancestor. */
export const connectKeyboardScrolling = (node: ScrollingFrame): void => {
  const listeners = createRealmAbortController(node.unsafeElement);
  node.unsafeElement.addEventListener('keydown', (event) => handleKeyboardScroll(node, event), {
    signal: listeners.signal,
  });
  lifecycle.onDestroy(node, () => listeners.abort());
};

const handleKeyboardScroll = (node: ScrollingFrame, event: KeyboardEvent): void => {
  if (
    event.target !== node.unsafeElement ||
    event.defaultPrevented ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    (event.shiftKey && event.key !== ' ')
  ) {
    return;
  }

  const intent = resolveKeyboardScrollIntent(event);

  if (!intent) {
    return;
  }

  const target = acceptsScrollAxis(node, intent.axis)
    ? node
    : findScrollingAncestor(node, intent.axis);

  if (!target) {
    return;
  }

  const distance =
    intent.distance === 'Line'
      ? 40
      : intent.axis === 'X'
        ? target.unsafeElement.clientWidth
        : target.unsafeElement.clientHeight;

  const offset = intent.direction * distance;
  event.preventDefault();
  const current = target.CanvasPosition;
  const maximum = target.MaxCanvasPosition;
  const next =
    intent.axis === 'X'
      ? vector2(Math.max(0, Math.min(maximum.X, current.X + offset)), current.Y)
      : vector2(current.X, Math.max(0, Math.min(maximum.Y, current.Y + offset)));

  // A key at a scroll boundary must not cancel a running CanvasPosition animation.
  if (next.X !== current.X || next.Y !== current.Y) {
    target.scrollTo(next);
  }
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
