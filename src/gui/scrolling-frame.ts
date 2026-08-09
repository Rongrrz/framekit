import { props, type GuiNode } from '../core/node';
import { frameDefaults, frameNode, type FrameProps } from './frame-node';

export type ScrollingDirection = 'X' | 'Y' | 'XY';

export type ScrollingFrameProps = FrameProps & {
  ScrollingDirection: ScrollingDirection;
};

export type ScrollingFrameNode = GuiNode<ScrollingFrameProps>;

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

export function canvasPosition(node: ScrollingFrameNode): Readonly<{ X: number; Y: number }> {
  return { X: node.element.scrollLeft, Y: node.element.scrollTop };
}

export function scrollTo(node: ScrollingFrameNode, position: { X: number; Y: number }): void {
  props(node);
  node.element.scrollTo(position.X, position.Y);
}
