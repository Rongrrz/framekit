import { signal, type Signal } from './core/event/signal';
import {
  uiAspectRatioConstraintNode,
  type UIAspectRatioConstraintNode,
  type UIAspectRatioConstraintProps,
} from './decorators/ui-aspect-ratio-constraint';
import { uiCornerNode, type UICornerNode, type UICornerProps } from './decorators/ui-corner';
import {
  uiListLayoutNode,
  type UIListLayoutNode,
  type UIListLayoutProps,
} from './decorators/ui-list-layout';
import { uiStrokeNode, type UIStrokeNode, type UIStrokeProps } from './decorators/ui-stroke';
import { frameDefaults, frameNode, type FrameNode, type FrameProps } from './gui/frame';
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

/** Creates a standalone synchronous signal with typed arguments. */
export function createSignal<Arguments extends unknown[] = []>(): Signal<Arguments> {
  return signal<Arguments>();
}

/** Creates a constraint that maintains its GUI parent's width-to-height ratio. */
export function createUIAspectRatioConstraint(
  initial: Partial<UIAspectRatioConstraintProps> = {},
): UIAspectRatioConstraintNode {
  return uiAspectRatioConstraintNode(initial);
}

/** Creates a corner decorator that applies border radius to its GUI parent. */
export function createUICorner(initial: Partial<UICornerProps> = {}): UICornerNode {
  return uiCornerNode(initial);
}

/** Creates a list layout that arranges its parent's direct GUI children. */
export function createUIListLayout(initial: Partial<UIListLayoutProps> = {}): UIListLayoutNode {
  return uiListLayoutNode(initial);
}

/** Creates a stroke decorator that applies a border effect to its GUI parent. */
export function createUIStroke(initial: Partial<UIStrokeProps> = {}): UIStrokeNode {
  return uiStrokeNode(initial);
}

/** Creates a general-purpose rectangular GUI node. */
export function createFrame(initial: Partial<FrameProps> = {}): FrameNode {
  return frameNode('Frame', document.createElement('div'), frameDefaults(), initial);
}

/** Creates the root GUI node that can be mounted into the document. */
export function createScreenGui(initial: Partial<ScreenGuiProps> = {}): ScreenGuiNode {
  return screenGuiNode(initial);
}

/** Creates a non-interactive text GUI node. */
export function createTextLabel(initial: Partial<TextLabelProps> = {}): TextLabelNode {
  return textNode('TextLabel', document.createElement('div'), textLabelDefaults(), initial);
}

/** Creates a text GUI node backed by a semantic HTML button. */
export function createTextButton(initial: Partial<TextButtonProps> = {}): TextButtonNode {
  return textButtonNode(initial);
}

/** Creates a non-interactive image GUI node. */
export function createImageLabel(initial: Partial<ImageLabelProps> = {}): ImageLabelNode {
  return imageNode('ImageLabel', document.createElement('div'), imageLabelDefaults(), initial);
}

/** Creates an image GUI node backed by a semantic HTML button. */
export function createImageButton(initial: Partial<ImageButtonProps> = {}): ImageButtonNode {
  return imageButtonNode(initial);
}

/** Creates a frame with native horizontal and/or vertical scrolling. */
export function createScrollingFrame(
  initial: Partial<ScrollingFrameProps> = {},
): ScrollingFrameNode {
  return scrollingFrameNode(initial);
}
