import { assertNodeActive } from '../runtime/node';
import type { GuiNode } from '../runtime/render';
import { createFrameNode, defaultFrameProps, type FrameProps } from './frame';

export type ScrollingDirection = 'X' | 'Y' | 'XY';
export type ScrollingFrameProps = FrameProps & { ScrollingDirection: ScrollingDirection };
export type ScrollingFrameNode = GuiNode<ScrollingFrameProps>;
export type CanvasPosition = Readonly<{ X: number; Y: number }>;

export function createScrollingFrame(
  initial: Partial<ScrollingFrameProps> = {},
): ScrollingFrameNode {
  const element = document.createElement('div');
  element.style.overscrollBehavior = 'contain';
  return createFrameNode(
    'ScrollingFrame',
    element,
    { ...defaultFrameProps(), Name: 'ScrollingFrame', ScrollingDirection: 'XY' },
    initial,
    (props) => {
      const scrollX = props.ScrollingDirection === 'X' || props.ScrollingDirection === 'XY';
      const scrollY = props.ScrollingDirection === 'Y' || props.ScrollingDirection === 'XY';
      element.style.overflowX = scrollX ? 'auto' : 'hidden';
      element.style.overflowY = scrollY ? 'auto' : 'hidden';
    },
  );
}

export function canvasPosition(node: ScrollingFrameNode): CanvasPosition {
  assertNodeActive(node);
  return { X: node.element.scrollLeft, Y: node.element.scrollTop };
}

export function scrollTo(node: ScrollingFrameNode, position: CanvasPosition): void {
  assertNodeActive(node);
  node.element.scrollTo(position.X, position.Y);
}
