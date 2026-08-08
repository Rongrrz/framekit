import { MathUtils } from '../utils/MathUtils';
import { Frame } from './Frame';

export type ScaleType = 'Stretch' | 'Fit' | 'Crop';

export class ImageLabel extends Frame {
  readonly #imageElement: HTMLImageElement;
  #image = '';
  #imageTransparency = 0;
  #scaleType: ScaleType = 'Stretch';

  public constructor(element: HTMLElement = document.createElement('div')) {
    super(element);
    this.BackgroundTransparency = 1;
    this.#imageElement = document.createElement('img');
    this.#imageElement.alt = '';
    this.#imageElement.draggable = false;
    this.#imageElement.dataset.framekitImage = '';
    Object.assign(this.#imageElement.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
    });
    this.Element.prepend(this.#imageElement);
    this.syncImageStyle();
  }

  public get Image(): string {
    return this.#image;
  }
  public set Image(value: string) {
    this.assertAlive();
    this.#image = value;
    this.#imageElement.src = value;
  }
  public get ImageTransparency(): number {
    return this.#imageTransparency;
  }
  public set ImageTransparency(value: number) {
    this.assertAlive();
    this.#imageTransparency = MathUtils.clamp(value, 0, 1);
    this.#imageElement.style.opacity = String(1 - this.#imageTransparency);
  }
  public get ScaleType(): ScaleType {
    return this.#scaleType;
  }
  public set ScaleType(value: ScaleType) {
    this.assertAlive();
    this.#scaleType = value;
    this.syncScaleType();
  }
  public get AltText(): string {
    return this.#imageElement.alt;
  }
  public set AltText(value: string) {
    this.assertAlive();
    this.#imageElement.alt = value;
  }

  private syncImageStyle(): void {
    this.Image = this.#image;
    this.ImageTransparency = this.#imageTransparency;
    this.syncScaleType();
  }

  private syncScaleType(): void {
    this.#imageElement.style.objectFit = { Stretch: 'fill', Fit: 'contain', Crop: 'cover' }[
      this.#scaleType
    ];
  }
}
