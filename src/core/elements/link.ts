import { DestroyService } from '../destroy-service';
import { assertAllowedValue, assertString } from '../internal/validation';
import { emitNodeEvent } from '../node/events';
import { guiEventKeys, linkEventMethods, type ClickEventMethods } from '../node/gui-events';
import type { GuiElement } from '../node/gui-node';
import { createDefaultTextProperties, createTextNode, type TextLabelProperties } from './text';

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
export function createLink(initialProperties: Partial<LinkProperties> = {}): Link {
  const element = document.createElement('a');
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
      if (changedProperties.has('Href')) setOptionalAttribute(element, 'href', properties.Href);
      if (changedProperties.has('Target')) element.target = properties.Target;
      if (changedProperties.has('Rel')) setOptionalAttribute(element, 'rel', properties.Rel);
      if (changedProperties.has('Download')) {
        setOptionalAttribute(element, 'download', properties.Download);
      }
      if (changedProperties.has('AccessibleLabel')) {
        setOptionalAttribute(element, 'aria-label', properties.AccessibleLabel);
      }
    },
    linkEventMethods,
    validateLinkProperties,
    false,
  ) as Link;

  const listenerController = new AbortController();
  element.addEventListener('click', (event) => emitNodeEvent(node, guiEventKeys.click, event), {
    signal: listenerController.signal,
  });
  DestroyService.onDestroy(node, () => listenerController.abort());
  return node;
}

function validateLinkProperties(properties: Readonly<LinkProperties>): void {
  assertString(properties.Href, 'Href');
  assertAllowedValue(properties.Target, linkTargets, 'Target');
  assertString(properties.Rel, 'Rel');
  assertString(properties.Download, 'Download');
  assertString(properties.AccessibleLabel, 'AccessibleLabel');
  validateLinkDestination(properties.Href);
}

function validateLinkDestination(href: string): void {
  if (!href) return;
  const url = new URL(href, document.baseURI);
  if (!allowedLinkProtocols.has(url.protocol)) {
    throw new TypeError(`Unsupported link URL protocol "${url.protocol}".`);
  }
}

function setOptionalAttribute(element: HTMLElement, name: string, value: string): void {
  if (value) element.setAttribute(name, value);
  else element.removeAttribute(name);
}
