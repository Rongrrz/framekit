import type { GuiNode, Render } from '../core/node/variants/gui';
import { clamp } from '../utils/math';
import { frameDefaults, frameNode, type FrameProps } from './frame';

export type ScaleType = 'Stretch' | 'Fit' | 'Crop';

export type ImageLabelProps = FrameProps & {
  Image: string;
  ImageTransparency: number;
  ScaleType: ScaleType;
  AltText: string;
};

export type ImageLabelNode = GuiNode<ImageLabelProps>;

const objectFit = { Stretch: 'fill', Fit: 'contain', Crop: 'cover' } as const;

export function imageLabelDefaults(): ImageLabelProps {
  return {
    ...frameDefaults(),
    Name: 'ImageLabel',
    BackgroundTransparency: 1,
    Image: '',
    ImageTransparency: 0,
    ScaleType: 'Stretch',
    AltText: '',
  };
}

export function imageNode<Props extends ImageLabelProps>(
  kind: string,
  element: HTMLElement,
  defaults: Props,
  initial: Partial<Props>,
  renderExtra?: Render<Props>,
): GuiNode<Props> {
  const imageElement = document.createElement('img');
  imageElement.draggable = false;
  imageElement.dataset.framekitImage = '';
  Object.assign(imageElement.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  });
  element.prepend(imageElement);

  return frameNode(kind, element, defaults, initial, (props, changed) => {
    if (changed.has('Image')) {
      if (props.Image) imageElement.src = props.Image;
      else imageElement.removeAttribute('src');
    }
    if (changed.has('AltText')) imageElement.alt = props.AltText;
    if (changed.has('ImageTransparency')) {
      imageElement.style.opacity = String(1 - clamp(props.ImageTransparency, 0, 1));
    }
    if (changed.has('ScaleType')) {
      imageElement.style.objectFit = objectFit[props.ScaleType];
    }
    renderExtra?.(props, changed);
  });
}
