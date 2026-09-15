import {
  createDefaultGuiObjectProperties,
  createGuiObjectNode,
  type GuiObjectProperties,
} from '../gui-object';
import { assertAllowedValue } from '../internal/validation';
import type { GuiElement } from '../node/gui-node';

/** Properties for a rectangular GUI container. */
export type FrameProperties = GuiObjectProperties;

/** Semantic HTML elements that can act as a general-purpose frame. */
export type FrameTagName = (typeof frameTagNames)[number];

/** Creation-only options for a frame's native element. */
export type FrameOptions = Readonly<{ tagName?: FrameTagName }>;

/** A rectangular DOM-backed GUI container. */
export type Frame = GuiElement<FrameProperties> & {
  readonly unsafeElement: HTMLElementTagNameMap[FrameTagName];
};

const frameTagNames = [
  'div',
  'main',
  'section',
  'article',
  'aside',
  'header',
  'footer',
  'nav',
  'figure',
] as const;

/** Creates a rectangular GUI container. */
export function createFrame(
  initialProperties: Partial<FrameProperties> = {},
  options: FrameOptions = {},
): Frame {
  const tagName = options.tagName ?? 'div';
  assertAllowedValue(tagName, frameTagNames, 'Frame tagName');
  return createGuiObjectNode({
    className: 'Frame',
    element: document.createElement(tagName),
    defaultProperties: { ...createDefaultGuiObjectProperties(), Name: 'Frame' },
    initialProperties,
  }) as Frame;
}
