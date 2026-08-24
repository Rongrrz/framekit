import type { GuiNode, Render } from '../runtime/render';
import { configureButton, type ButtonNode, type ButtonProps } from './button';
import { createFrameNode, defaultFrameProps, type FrameProps } from './frame';

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
const allowedImageProtocols = new Set(['http:', 'https:', 'blob:']);

export function createImageLabel(initial: Partial<ImageLabelProps> = {}): ImageLabelNode {
  return createImageNode('ImageLabel', document.createElement('div'), defaultImageProps(), initial);
}

export function createImageButton(initial: Partial<ImageButtonProps> = {}): ImageButtonNode {
  const element = document.createElement('button');
  const node = createImageNode(
    'ImageButton',
    element,
    { ...defaultImageProps(), Name: 'ImageButton', Disabled: false },
    initial,
    (props) => {
      element.disabled = props.Disabled;
      element.style.cursor = props.Disabled ? 'not-allowed' : 'pointer';
    },
  ) as ImageButtonNode;
  configureButton(node, element);
  return node;
}

function defaultImageProps(): ImageLabelProps {
  return {
    ...defaultFrameProps(),
    Name: 'ImageLabel',
    BackgroundTransparency: 1,
    Image: '',
    ImageTransparency: 0,
    ScaleType: 'Stretch',
    AltText: '',
  };
}

function createImageNode<Props extends ImageLabelProps>(
  kind: string,
  element: HTMLElement,
  defaults: Props,
  initial: Partial<Props>,
  renderExtra?: Render<Props>,
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

  return createFrameNode(kind, element, defaults, initial, (props, changed) => {
    if (changed.has('Image')) setImageSource(image, props.Image);
    if (changed.has('AltText')) image.alt = props.AltText;
    if (changed.has('ImageTransparency')) {
      image.style.opacity = String(1 - clamp(props.ImageTransparency, 0, 1));
    }
    if (changed.has('ScaleType')) image.style.objectFit = objectFit[props.ScaleType];
    renderExtra?.(props, changed);
  });
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
