import { node, type Node, type NodeProps } from './core/node';
import { signal, type Signal } from './core/signal';
import { frameDefaults, frameNode, type FrameNode, type FrameProps } from './gui/frame-node';
import { imageButtonNode, type ImageButtonNode, type ImageButtonProps } from './gui/image-button';
import {
  imageLabelDefaults,
  imageNode,
  type ImageLabelNode,
  type ImageLabelProps,
} from './gui/image-label';
import { screenGuiNode, type ScreenGuiNode, type ScreenGuiProps } from './gui/screen-gui';
import {
  scrollingFrameNode,
  type ScrollingFrameNode,
  type ScrollingFrameProps,
} from './gui/scrolling-frame';
import { textButtonNode, type TextButtonNode, type TextButtonProps } from './gui/text-button';
import {
  textLabelDefaults,
  textNode,
  type TextLabelNode,
  type TextLabelProps,
} from './gui/text-label';

export function createNode(initial: Partial<NodeProps> = {}): Node<NodeProps> {
  return node({ Name: 'Node', ...initial });
}

export function createSignal<Arguments extends unknown[] = []>(): Signal<Arguments> {
  return signal<Arguments>();
}

export function createFrame(initial: Partial<FrameProps> = {}): FrameNode {
  return frameNode('Frame', document.createElement('div'), frameDefaults(), initial);
}

export function createScreenGui(initial: Partial<ScreenGuiProps> = {}): ScreenGuiNode {
  return screenGuiNode(initial);
}

export function createTextLabel(initial: Partial<TextLabelProps> = {}): TextLabelNode {
  return textNode('TextLabel', document.createElement('div'), textLabelDefaults(), initial);
}

export function createTextButton(initial: Partial<TextButtonProps> = {}): TextButtonNode {
  return textButtonNode(initial);
}

export function createImageLabel(initial: Partial<ImageLabelProps> = {}): ImageLabelNode {
  return imageNode('ImageLabel', document.createElement('div'), imageLabelDefaults(), initial);
}

export function createImageButton(initial: Partial<ImageButtonProps> = {}): ImageButtonNode {
  return imageButtonNode(initial);
}

export function createScrollingFrame(
  initial: Partial<ScrollingFrameProps> = {},
): ScrollingFrameNode {
  return scrollingFrameNode(initial);
}
