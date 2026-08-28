import { buttonEventMethods, type GuiEventMethodTable } from '../runtime/gui-events';
import { type GuiNode, type PropertyRenderer } from '../runtime/render';
import {
  assertAllowedValue,
  assertBoolean,
  assertFiniteNumber,
  assertString,
} from '../runtime/validation';
import { initializeButtonElement, type ButtonNode, type ButtonProps } from './button';
import { createDefaultFrameProps, createFrameBasedNode, type FrameProps } from './frame';

export type ScaleType = 'Stretch' | 'Fit' | 'Crop';

export type ImageLabelProps = FrameProps & {
  Image: string;
  ImageTransparency: number;
  ScaleType: ScaleType;
  AltText: string;
};

export type ImageLabelNode = GuiNode<ImageLabelProps>;
export type ImageButtonProps = ImageLabelProps & ButtonProps;
export type ImageButtonNode = GuiNode<ImageButtonProps> & ButtonNode;

const objectFit = { Stretch: 'fill', Fit: 'contain', Crop: 'cover' } as const;
const scaleTypes: readonly ScaleType[] = ['Stretch', 'Fit', 'Crop'];
const allowedImageProtocols = new Set(['http:', 'https:', 'blob:']);

export function createImageLabel(initial: Partial<ImageLabelProps> = {}): ImageLabelNode {
  return createImageNode(
    'ImageLabel',
    document.createElement('div'),
    createDefaultImageProps(),
    initial,
  );
}

export function createImageButton(initial: Partial<ImageButtonProps> = {}): ImageButtonNode {
  const element = document.createElement('button');
  const node = createImageNode(
    'ImageButton',
    element,
    { ...createDefaultImageProps(), Name: 'ImageButton', Disabled: false },
    initial,
    (props) => {
      assertBoolean(props.Disabled, 'Disabled');
      element.disabled = props.Disabled;
      element.style.cursor = props.Disabled ? 'not-allowed' : 'pointer';
    },
    buttonEventMethods,
  ) as ImageButtonNode;
  initializeButtonElement(node, element);
  return node;
}

function createDefaultImageProps(): ImageLabelProps {
  return {
    ...createDefaultFrameProps(),
    Name: 'ImageLabel',
    BackgroundTransparency: 1,
    Image: '',
    ImageTransparency: 0,
    ScaleType: 'Stretch',
    AltText: '',
  };
}

function createImageNode<Props extends ImageLabelProps>(
  nodeType: string,
  element: HTMLElement,
  defaultProps: Props,
  initial: Partial<Props>,
  renderAdditionalProperties?: PropertyRenderer<Props>,
  eventMethods?: GuiEventMethodTable,
): GuiNode<Props> {
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
    defaultProps,
    initial,
    (props, changed) => {
      if (changed.has('Image')) {
        assertString(props.Image, 'Image');
        setImageSource(image, props.Image);
      }
      if (changed.has('AltText')) {
        assertString(props.AltText, 'AltText');
        image.alt = props.AltText;
      }
      if (changed.has('ImageTransparency')) {
        assertFiniteNumber(props.ImageTransparency, 'ImageTransparency');
        image.style.opacity = String(1 - clamp(props.ImageTransparency, 0, 1));
      }
      if (changed.has('ScaleType')) {
        assertAllowedValue(props.ScaleType, scaleTypes, 'ScaleType');
        image.style.objectFit = objectFit[props.ScaleType];
      }
      renderAdditionalProperties?.(props, changed);
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
