import { buttonEventMethods, type GuiEventMethodTable } from '../../shared/runtime/gui-events';
import { type GuiNode, type PropertyRenderer } from '../../shared/runtime/render';
import {
  assertAllowedValue,
  assertBoolean,
  assertFiniteNumber,
  assertString,
} from '../../shared/runtime/validation';
import { initializeButtonElement, type ButtonNode, type ButtonProperties } from './button';
import { createDefaultFrameProperties, createFrameBasedNode, type FrameProperties } from './frame';

/** How an image is fitted within its node bounds. */
export type ScaleType = 'Stretch' | 'Fit' | 'Crop';

/** Properties shared by image labels and image buttons. */
export type ImageLabelProperties = FrameProperties & {
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
export type ImageLabelNode = GuiNode<ImageLabelProperties>;

/** Properties for an interactive image button. */
export type ImageButtonProperties = ImageLabelProperties & ButtonProperties;

/** An image node with typed button events. */
export type ImageButtonNode = ButtonNode<ImageButtonProperties>;

const objectFit = { Stretch: 'fill', Fit: 'contain', Crop: 'cover' } as const;
const scaleTypes: readonly ScaleType[] = ['Stretch', 'Fit', 'Crop'];
const allowedImageProtocols = new Set(['http:', 'https:', 'blob:']);

/** Creates a non-interactive image node. */
export function createImageLabel(initial: Partial<ImageLabelProperties> = {}): ImageLabelNode {
  return createImageNode(
    'ImageLabel',
    document.createElement('div'),
    createDefaultImageProps(),
    initial,
  );
}

/** Creates an image node with button events. */
export function createImageButton(initial: Partial<ImageButtonProperties> = {}): ImageButtonNode {
  const element = document.createElement('button');
  const node = createImageNode(
    'ImageButton',
    element,
    { ...createDefaultImageProps(), Name: 'ImageButton', Disabled: false },
    initial,
    (properties) => {
      assertBoolean(properties.Disabled, 'Disabled');
      element.disabled = properties.Disabled;
      element.style.cursor = properties.Disabled ? 'not-allowed' : 'pointer';
    },
    buttonEventMethods,
  ) as ImageButtonNode;

  initializeButtonElement(node, element);
  return node;
}

function createDefaultImageProps(): ImageLabelProperties {
  return {
    ...createDefaultFrameProperties(),
    Name: 'ImageLabel',
    BackgroundTransparency: 1,
    Image: '',
    ImageTransparency: 0,
    ScaleType: 'Stretch',
    AltText: '',
  };
}

function createImageNode<Properties extends ImageLabelProperties>(
  nodeType: string,
  element: HTMLElement,
  defaultProperties: Properties,
  initial: Partial<Properties>,
  renderAdditionalProperties?: PropertyRenderer<Properties>,
  eventMethods?: GuiEventMethodTable,
): GuiNode<Properties> {
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

  return createFrameBasedNode(
    nodeType,
    element,
    defaultProperties,
    initial,
    (properties, changed) => {
      if (changed.has('Image')) {
        assertString(properties.Image, 'Image');
        setImageSource(image, properties.Image);
      }
      if (changed.has('AltText')) {
        assertString(properties.AltText, 'AltText');
        image.alt = properties.AltText;
      }
      if (changed.has('ImageTransparency')) {
        assertFiniteNumber(properties.ImageTransparency, 'ImageTransparency');
        image.style.opacity = String(1 - clamp(properties.ImageTransparency, 0, 1));
      }
      if (changed.has('ScaleType')) {
        assertAllowedValue(properties.ScaleType, scaleTypes, 'ScaleType');
        image.style.objectFit = objectFit[properties.ScaleType];
      }

      renderAdditionalProperties?.(properties, changed);
    },
    eventMethods,
  );
}

function setImageSource(element: HTMLImageElement, source: string): void {
  if (!source) {
    element.removeAttribute('src');
    return;
  }
  const url = new URL(source, document.baseURI);
  const allowedDataImage = url.protocol === 'data:' && /^data:image\//i.test(source);
  if (!allowedImageProtocols.has(url.protocol) && !allowedDataImage) {
    throw new TypeError(`Unsupported image URL protocol "${url.protocol}".`);
  }

  element.src = source;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
