import { resolveOwnerDocument, type DomOptions } from '#internal/dom/environment.js';
import type { GuiElement } from '#internal/runtime/node/gui-node.js';
import { assertAllowedValue } from '#internal/validation.js';

import {
  createDefaultGuiObjectProperties,
  createGuiObjectNode,
  type GuiObjectProperties,
} from './gui-object.js';

/** Properties for a rectangular GUI container. */
export type FrameProperties = GuiObjectProperties;

/** Semantic HTML elements that can act as a general-purpose frame. */
export type FrameTagName = (typeof frameTagNames)[number];

/** Initial frame properties, including its creation-only native tag. */
export type FrameOptions = Readonly<
  Partial<FrameProperties> & {
    /** Native container tag. Defaults to div; fixed for the instance's lifetime. */
    TagName?: FrameTagName;
  }
>;

/** A rectangular DOM-backed GUI container. */
export type Frame = GuiElement<FrameProperties> & {
  readonly unsafeElement: HTMLElementTagNameMap[FrameTagName];
};

const frameTagNames = [
  'div',
  'dialog',
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
export function createFrame(initialProperties: FrameOptions = {}, options: DomOptions = {}): Frame {
  const { TagName = 'div', ...properties } = initialProperties;
  assertAllowedValue(TagName, frameTagNames, 'Frame TagName');
  return createGuiObjectNode({
    className: 'Frame',
    element: resolveOwnerDocument(options).createElement(TagName),
    defaultProperties: { ...createDefaultGuiObjectProperties(), Name: 'Frame' },
    initialProperties: properties,
  }) as Frame;
}
