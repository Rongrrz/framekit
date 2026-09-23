import { resolveOwnerDocument, type DomOptions } from '#internal/dom/environment.js';
import { buttonEventMethods, type GuiMethodTable } from '#internal/runtime/node/gui-events.js';
import type { GuiElement, PropertyRenderer } from '#internal/runtime/node/gui-node.js';
import { assertAllowedValue, assertString, assertUnitInterval } from '#internal/validation.js';

import {
  initializeButtonElement,
  renderButtonProperties,
  type ButtonElement,
  type ButtonProperties,
  validateButtonProperties,
} from './button-events.js';
import {
  createDefaultGuiObjectProperties,
  createGuiObjectNode,
  type GuiObjectProperties,
} from './gui-object.js';

/** How an image is fitted within its node bounds. */
export type ScaleType = 'Stretch' | 'Fit' | 'Crop';

/** Semantic HTML elements that can wrap an image label. */
export type ImageLabelTagName = (typeof imageLabelTagNames)[number];

/** Creation-only options for an image label's native wrapper. */
export type ImageLabelOptions = Readonly<DomOptions & { tagName?: ImageLabelTagName }>;

/** Properties shared by image labels and image buttons. */
export type ImageLabelProperties = GuiObjectProperties & {
  /** Image URL. Supports HTTP(S), blob, and image data URLs. */
  Image: string;
  /** Image transparency from 0 (opaque) to 1 (invisible). */
  ImageTransparency: number;
  /** How the image fits within this node's bounds. */
  ScaleType: ScaleType;
  /** Accessible description passed to the underlying image. */
  AltText: string;
};

/** A non-interactive image node. */
export type ImageLabel = GuiElement<ImageLabelProperties> & {
  readonly unsafeElement: HTMLElementTagNameMap[ImageLabelTagName];
};

/** Properties for an interactive image button. */
export type ImageButtonProperties = ImageLabelProperties & ButtonProperties;

/** An image node with typed button events. */
export type ImageButton = ButtonElement<ImageButtonProperties>;

const objectFit = {
  Stretch: 'fill',
  Fit: 'contain',
  Crop: 'cover',
} satisfies Record<ScaleType, string>;
const scaleTypes: readonly ScaleType[] = ['Stretch', 'Fit', 'Crop'];
const imageLabelTagNames = ['div', 'figure'] as const;
const allowedImageProtocols = new Set(['http:', 'https:', 'blob:']);

/** Creates a non-interactive image node. */
export function createImageLabel(
  initialProperties: Partial<ImageLabelProperties> = {},
  options: ImageLabelOptions = {},
): ImageLabel {
  const tagName = options.tagName ?? 'div';
  assertAllowedValue(tagName, imageLabelTagNames, 'ImageLabel tagName');
  return createImageNode(
    'ImageLabel',
    resolveOwnerDocument(options).createElement(tagName),
    createDefaultImageProperties(),
    initialProperties,
  ) as ImageLabel;
}

/** Creates an image node with button events. */
export function createImageButton(
  initialProperties: Partial<ImageButtonProperties> = {},
  options: DomOptions = {},
): ImageButton {
  const element = resolveOwnerDocument(options).createElement('button');
  const node = createImageNode(
    'ImageButton',
    element,
    {
      ...createDefaultImageProperties(),
      Name: 'ImageButton',
      Disabled: false,
      AutoButtonColor: true,
      AccessibleLabel: '',
    },
    initialProperties,
    (properties, changedProperties) => {
      if (
        changedProperties.has('Disabled') ||
        changedProperties.has('AutoButtonColor') ||
        changedProperties.has('AccessibleLabel')
      ) {
        renderButtonProperties(element, properties);
      }
    },
    buttonEventMethods,
    false,
  ) as ImageButton;

  initializeButtonElement(node, element);
  return node;
}

function createDefaultImageProperties(): ImageLabelProperties {
  return {
    ...createDefaultGuiObjectProperties(),
    Name: 'ImageLabel',
    BackgroundTransparency: 1,
    Image: '',
    ImageTransparency: 0,
    ScaleType: 'Stretch',
    AltText: '',
  };
}

function createImageNode<Properties extends ImageLabelProperties>(
  className: string,
  element: HTMLElement,
  defaultProperties: Properties,
  initialProperties: Partial<Properties>,
  renderAdditionalProperties?: PropertyRenderer<Properties>,
  methods?: GuiMethodTable,
  canContainGuiChildren = true,
): GuiElement<Properties> {
  const image = element.ownerDocument.createElement('img');
  image.draggable = false;
  image.decoding = 'async';
  image.referrerPolicy = 'no-referrer';
  image.dataset.framekitImage = '';
  Object.assign(image.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  });
  element.prepend(image);

  return createGuiObjectNode({
    className,
    element,
    defaultProperties,
    initialProperties,
    renderProperties: (properties, changedProperties) => {
      if (changedProperties.has('Image')) {
        setImageSource(image, properties.Image);
      }
      if (changedProperties.has('AltText')) {
        image.alt = properties.AltText;
      }
      if (changedProperties.has('ImageTransparency')) {
        image.style.opacity = String(1 - properties.ImageTransparency);
      }
      if (changedProperties.has('ScaleType')) {
        image.style.objectFit = objectFit[properties.ScaleType];
      }

      renderAdditionalProperties?.(properties, changedProperties);
    },
    methods,
    canContainGuiChildren,
    validateProperties: (properties) => validateImageProperties(properties, element.ownerDocument),
  });
}

function validateImageProperties(
  properties: Readonly<ImageLabelProperties | ImageButtonProperties>,
  ownerDocument: Document,
): void {
  assertString(properties.Image, 'Image');
  assertString(properties.AltText, 'AltText');
  assertUnitInterval(properties.ImageTransparency, 'ImageTransparency');
  assertAllowedValue(properties.ScaleType, scaleTypes, 'ScaleType');
  if ('Disabled' in properties) {
    validateButtonProperties(properties);
  }
  validateImageSource(properties.Image, ownerDocument);
}

function setImageSource(element: HTMLImageElement, source: string): void {
  if (!source) {
    element.removeAttribute('src');
    return;
  }
  element.src = source;
}

function validateImageSource(source: string, ownerDocument: Document): void {
  if (!source) {
    return;
  }
  const url = new URL(source, ownerDocument.baseURI);
  const allowedDataImage = url.protocol === 'data:' && /^data:image\//i.test(source);
  if (!allowedImageProtocols.has(url.protocol) && !allowedDataImage) {
    throw new TypeError(`Unsupported image URL protocol "${url.protocol}".`);
  }
}
