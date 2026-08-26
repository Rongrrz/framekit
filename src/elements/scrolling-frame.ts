import { addCleanup, assertNodeActive, props, update } from '../runtime/node';
import type { GuiNode } from '../runtime/render';
import { vector2, type Vector2 } from '../values/vector2';
import { createFrameNode, defaultFrameProps, type FrameProps } from './frame';

export type ScrollingDirection = 'X' | 'Y' | 'XY';
export type ScrollingFrameProps = FrameProps & {
  ScrollingDirection: ScrollingDirection;
  CanvasPosition: Vector2;
};
export type ScrollingFrameNode = GuiNode<ScrollingFrameProps>;
export type CanvasPosition = Vector2;

export function createScrollingFrame(
  initial: Partial<ScrollingFrameProps> = {},
): ScrollingFrameNode {
  const element = document.createElement('div');
  element.style.overscrollBehavior = 'contain';
  const node = createFrameNode<ScrollingFrameProps>(
    'ScrollingFrame',
    element,
    {
      ...defaultFrameProps(),
      Name: 'ScrollingFrame',
      ScrollingDirection: 'XY',
      CanvasPosition: vector2(0, 0),
    },
    initial,
    (current, changed) => {
      const scrollX = current.ScrollingDirection === 'X' || current.ScrollingDirection === 'XY';
      const scrollY = current.ScrollingDirection === 'Y' || current.ScrollingDirection === 'XY';
      element.style.overflowX = scrollX ? 'auto' : 'hidden';
      element.style.overflowY = scrollY ? 'auto' : 'hidden';
      if (
        changed.has('CanvasPosition') &&
        (element.scrollLeft !== current.CanvasPosition.X ||
          element.scrollTop !== current.CanvasPosition.Y)
      ) {
        if (typeof element.scrollTo === 'function') {
          element.scrollTo(current.CanvasPosition.X, current.CanvasPosition.Y);
        } else {
          element.scrollLeft = current.CanvasPosition.X;
          element.scrollTop = current.CanvasPosition.Y;
        }
      }
    },
  );

  const synchronizeCanvasPosition = (): void => {
    const current = props(node).CanvasPosition;
    if (current.X === element.scrollLeft && current.Y === element.scrollTop) return;
    update(node, { CanvasPosition: vector2(element.scrollLeft, element.scrollTop) });
  };
  element.addEventListener('scroll', synchronizeCanvasPosition, { passive: true });
  addCleanup(node, () => element.removeEventListener('scroll', synchronizeCanvasPosition));
  return node;
}

export function canvasPosition(node: ScrollingFrameNode): CanvasPosition {
  assertNodeActive(node);
  return vector2(node.element.scrollLeft, node.element.scrollTop);
}

export function scrollTo(node: ScrollingFrameNode, position: CanvasPosition): void {
  update(node, { CanvasPosition: vector2(position.X, position.Y) });
}
