import { assertNodeActive } from '../core/node/lifecycle';
import type { GuiNode } from '../core/node/variants/gui';
import { frameDefaults, frameNode, type FrameProps } from './frame';

export type ScrollingDirection = 'X' | 'Y' | 'XY';

export type ScrollingFrameProps = FrameProps & {
  ScrollingDirection: ScrollingDirection;
};

export type ScrollingFrameNode = GuiNode<ScrollingFrameProps>;

/** The current horizontal and vertical scroll offsets in CSS pixels. */
export type CanvasPosition = Readonly<{ X: number; Y: number }>;

export function scrollingFrameNode(initial: Partial<ScrollingFrameProps> = {}): ScrollingFrameNode {
  const element = document.createElement('div');
  element.style.overscrollBehavior = 'contain';
  return frameNode(
    'ScrollingFrame',
    element,
    { ...frameDefaults(), Name: 'ScrollingFrame', ScrollingDirection: 'XY' },
    initial,
    (props) => {
      element.style.overflowX =
        props.ScrollingDirection === 'X' || props.ScrollingDirection === 'XY' ? 'auto' : 'hidden';
      element.style.overflowY =
        props.ScrollingDirection === 'Y' || props.ScrollingDirection === 'XY' ? 'auto' : 'hidden';
    },
  );
}

/** Returns a snapshot of the scrolling frame's current scroll offsets. */
export function canvasPosition(node: ScrollingFrameNode): CanvasPosition {
  assertNodeActive(node);
  return { X: node.element.scrollLeft, Y: node.element.scrollTop };
}

/** Immediately scrolls a scrolling frame to the supplied offsets. */
export function scrollTo(node: ScrollingFrameNode, position: CanvasPosition): void {
  assertNodeActive(node);
  node.element.scrollTo(position.X, position.Y);
}
