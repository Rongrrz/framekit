import {
  initializeButtonElement,
  renderButtonProperties,
  type ButtonElement,
  type ButtonProperties,
  validateButtonProperties,
} from '../../dom/button';
import { buttonEventMethods, type GuiMethodTable } from '../../runtime/gui-events';
import type { GuiElement, PropertyRenderer } from '../../runtime/gui-node';
import { assertAllowedValue, assertFiniteNumber, assertString } from '../../runtime/validation';
import {
  createDefaultGuiObjectProperties,
  createGuiObjectNode,
  type GuiObjectProperties,
} from '../gui-object';

/** How an image is fitted within its node bounds. */
export type ScaleType = 'Stretch' | 'Fit' | 'Crop';

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
export type ImageLabel = GuiElement<ImageLabelProperties>;

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
const allowedImageProtocols = new Set(['http:', 'https:', 'blob:']);

/** Creates a non-interactive image node. */
export function createImageLabel(
  initialProperties: Partial<ImageLabelProperties> = {},
): ImageLabel {
  return createImageNode(
    'ImageLabel',
    document.createElement('div'),
    createDefaultImageProperties(),
    initialProperties,
  );
}

/** Creates an image node with button events. */
export function createImageButton(
  initialProperties: Partial<ImageButtonProperties> = {},
): ImageButton {
  const element = document.createElement('button');
  const node = createImageNode(
    'ImageButton',
    element,
    {
      ...createDefaultImageProperties(),
      Name: 'ImageButton',
      Disabled: false,
      AccessibleLabel: '',
    },
    initialProperties,
    (properties, changedProperties) => {
      if (changedProperties.has('Disabled') || changedProperties.has('AccessibleLabel')) {
        renderButtonProperties(element, properties);
      }
    },
    buttonEventMethods,
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
): GuiElement<Properties> {
  const image = document.createElement('img');
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
        image.style.opacity = String(1 - clamp(properties.ImageTransparency, 0, 1));
      }
      if (changedProperties.has('ScaleType')) {
        image.style.objectFit = objectFit[properties.ScaleType];
      }

      renderAdditionalProperties?.(properties, changedProperties);
    },
    methods,
    validateProperties: validateImageProperties,
  });
}

function validateImageProperties(
  properties: Readonly<ImageLabelProperties | ImageButtonProperties>,
): void {
  assertString(properties.Image, 'Image');
  assertString(properties.AltText, 'AltText');
  assertFiniteNumber(properties.ImageTransparency, 'ImageTransparency');
  assertAllowedValue(properties.ScaleType, scaleTypes, 'ScaleType');
  if ('Disabled' in properties) validateButtonProperties(properties);
  validateImageSource(properties.Image);
}

function setImageSource(element: HTMLImageElement, source: string): void {
  if (!source) {
    element.removeAttribute('src');
    return;
  }
  element.src = source;
}

function validateImageSource(source: string): void {
  if (!source) return;
  const url = new URL(source, document.baseURI);
  const allowedDataImage = url.protocol === 'data:' && /^data:image\//i.test(source);
  if (!allowedImageProtocols.has(url.protocol) && !allowedDataImage) {
    throw new TypeError(`Unsupported image URL protocol "${url.protocol}".`);
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
