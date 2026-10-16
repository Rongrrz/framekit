import { resolveOwnerDocument, type DomOptions } from '#internal/dom/environment.js';
import { createStyledElementFactory } from '#internal/dom/styles.js';
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

const defaultFrameProperties: Readonly<FrameProperties> = Object.freeze({
  ...createDefaultGuiObjectProperties(),
  Name: 'Frame',
});

const frameTemplates = new WeakMap<Document, Map<FrameTagName, () => HTMLElement>>();

function createFrameElement(ownerDocument: Document, tagName: FrameTagName): HTMLElement {
  let templates = frameTemplates.get(ownerDocument);

  if (!templates) {
    templates = new Map();
    frameTemplates.set(ownerDocument, templates);
  }

  let createElement = templates.get(tagName);

  if (!createElement) {
    const node = createGuiObjectNode({
      className: 'Frame',
      element: ownerDocument.createElement(tagName),
      defaultProperties: defaultFrameProperties,
      initialProperties: {},
    });

    createElement = createStyledElementFactory(node.unsafeElement);
    node.destroy();
    templates.set(tagName, createElement);
  }

  return createElement();
}

/** Creates a rectangular GUI container. */
export function createFrame(initialProperties: FrameOptions = {}, options: DomOptions = {}): Frame {
  const { TagName = 'div', ...properties } = initialProperties;
  assertAllowedValue(TagName, frameTagNames, 'Frame TagName');

  return createGuiObjectNode({
    className: 'Frame',
    element: createFrameElement(resolveOwnerDocument(options), TagName),
    defaultProperties: defaultFrameProperties,
    initialProperties: properties,
    initialRenderProperties: Object.keys(properties) as (keyof FrameProperties)[],
  }) as Frame;
}
