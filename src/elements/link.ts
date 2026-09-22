import {
  createRealmAbortController,
  resolveOwnerDocument,
  type DomOptions,
} from '#dom/environment.js';
import { assertAllowedValue, assertString } from '#internal/validation.js';
import { emitNodeEvent } from '#runtime/node/events.js';
import {
  guiEventKeys,
  linkEventMethods,
  type ClickEventMethods,
} from '#runtime/node/gui-events.js';
import type { GuiElement } from '#runtime/node/gui-node.js';
import * as lifecycle from '#runtime/services/lifecycle.js';

import { createDefaultTextProperties, createTextNode, type TextLabelProperties } from './text.js';

/** Browser browsing contexts supported by Link. */
export type LinkTarget = (typeof linkTargets)[number];

/** Text and navigation properties for a native link. */
export type LinkProperties = TextLabelProperties & {
  /** URL opened when the link is activated. */
  Href: string;
  /** Browsing context in which the URL opens. */
  Target: LinkTarget;
  /** Relationship tokens applied to the destination. */
  Rel: string;
  /** Suggested download filename, or an empty string for normal navigation. */
  Download: string;
  /** Optional accessible name when visible text is not descriptive enough. */
  AccessibleLabel: string;
};

/** A text-styled native anchor with FrameKit lifecycle and events. */
export type Link = GuiElement<LinkProperties> &
  ClickEventMethods & {
    readonly unsafeElement: HTMLAnchorElement;
  };

const linkTargets = ['_self', '_blank', '_parent', '_top'] as const;
const allowedLinkProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:', 'blob:']);

/** Creates a native anchor whose navigation attributes remain property-driven. */
export function createLink(
  initialProperties: Partial<LinkProperties> = {},
  options: DomOptions = {},
): Link {
  const element = resolveOwnerDocument(options).createElement('a');
  const node = createTextNode(
    'Link',
    element,
    {
      ...createDefaultTextProperties(),
      Name: 'Link',
      Href: '',
      Target: '_self',
      Rel: '',
      Download: '',
      AccessibleLabel: '',
    },
    initialProperties,
    'span',
    (properties, changedProperties) => {
      if (changedProperties.has('Href')) {
        setOptionalAttribute(element, 'href', properties.Href);
      }
      if (changedProperties.has('Target')) {
        element.target = properties.Target;
      }
      if (changedProperties.has('Rel')) {
        setOptionalAttribute(element, 'rel', properties.Rel);
      }
      if (changedProperties.has('Download')) {
        setOptionalAttribute(element, 'download', properties.Download);
      }
      if (changedProperties.has('AccessibleLabel')) {
        setOptionalAttribute(element, 'aria-label', properties.AccessibleLabel);
      }
    },
    linkEventMethods,
    (properties) => validateLinkProperties(properties, element.ownerDocument),
    false,
  ) as Link;

  const listenerController = createRealmAbortController(element);
  element.addEventListener('click', (event) => emitNodeEvent(node, guiEventKeys.click, event), {
    signal: listenerController.signal,
  });
  lifecycle.onDestroy(node, () => listenerController.abort());
  return node;
}

function validateLinkProperties(
  properties: Readonly<LinkProperties>,
  ownerDocument: Document,
): void {
  assertString(properties.Href, 'Href');
  assertAllowedValue(properties.Target, linkTargets, 'Target');
  assertString(properties.Rel, 'Rel');
  assertString(properties.Download, 'Download');
  assertString(properties.AccessibleLabel, 'AccessibleLabel');
  validateLinkDestination(properties.Href, ownerDocument);
}

function validateLinkDestination(href: string, ownerDocument: Document): void {
  if (!href) {
    return;
  }
  const url = new URL(href, ownerDocument.baseURI);
  if (!allowedLinkProtocols.has(url.protocol)) {
    throw new TypeError(`Unsupported link URL protocol "${url.protocol}".`);
  }
}

function setOptionalAttribute(element: HTMLElement, name: string, value: string): void {
  if (value) {
    element.setAttribute(name, value);
  } else {
    element.removeAttribute(name);
  }
}
