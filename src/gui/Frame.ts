import { Instance } from '../core/Instance';
import { Color3 } from '../primitives/Color3';
import { UDim2 } from '../primitives/UDim2';
import { Vector2 } from '../primitives/Vector2';
import { isDomBacked, udimToCss } from '../rendering/dom';
import { ScreenGui } from './ScreenGui';

export type AutomaticSize = 'None' | 'X' | 'Y' | 'XY';

export class Frame extends Instance {
  public readonly Element: HTMLElement;
  #size = UDim2.fromOffset(100, 100);
  #position = UDim2.fromOffset(0, 0);
  #anchorPoint = new Vector2(0, 0);
  #visible = true;
  #backgroundColor3 = Color3.fromRGB(200, 200, 200);
  #backgroundTransparency = 0;
  #zIndex = 1;
  #automaticSize: AutomaticSize = 'None';
  #clipsDescendants = false;
  #borderSizePixel = 0;
  #borderColor3 = Color3.fromRGB(0, 0, 0);
  #cornerRadius = 0;

  public constructor(element: HTMLElement = document.createElement('div')) {
    super();
    this.Element = element;
    this.Element.dataset.framekit = this.constructor.name;
    this.Element.style.position = 'absolute';
    this.Element.style.boxSizing = 'border-box';
    this.syncStyle();
  }

  public get Size(): UDim2 {
    return this.#size;
  }
  public set Size(value: UDim2) {
    this.assertAlive();
    this.#size = value;
    this.syncSize();
  }
  public get Position(): UDim2 {
    return this.#position;
  }
  public set Position(value: UDim2) {
    this.assertAlive();
    this.#position = value;
    this.syncPosition();
  }
  public get AnchorPoint(): Vector2 {
    return this.#anchorPoint;
  }
  public set AnchorPoint(value: Vector2) {
    this.assertAlive();
    this.#anchorPoint = value;
    this.syncPosition();
  }
  public get Visible(): boolean {
    return this.#visible;
  }
  public set Visible(value: boolean) {
    this.assertAlive();
    this.#visible = value;
    this.Element.style.display = value ? '' : 'none';
  }
  public get BackgroundColor3(): Color3 {
    return this.#backgroundColor3;
  }
  public set BackgroundColor3(value: Color3) {
    this.assertAlive();
    this.#backgroundColor3 = value;
    this.syncColor();
  }
  public get BackgroundTransparency(): number {
    return this.#backgroundTransparency;
  }
  public set BackgroundTransparency(value: number) {
    this.assertAlive();
    this.#backgroundTransparency = value;
    this.syncColor();
  }
  public get ZIndex(): number {
    return this.#zIndex;
  }
  public set ZIndex(value: number) {
    this.assertAlive();
    this.#zIndex = value;
    this.Element.style.zIndex = String(value);
  }
  public get AutomaticSize(): AutomaticSize {
    return this.#automaticSize;
  }
  public set AutomaticSize(value: AutomaticSize) {
    this.assertAlive();
    this.#automaticSize = value;
    this.syncSize();
  }
  public get ClipsDescendants(): boolean {
    return this.#clipsDescendants;
  }
  public set ClipsDescendants(value: boolean) {
    this.assertAlive();
    this.#clipsDescendants = value;
    this.Element.style.overflow = value ? 'hidden' : 'visible';
  }
  public get BorderSizePixel(): number {
    return this.#borderSizePixel;
  }
  public set BorderSizePixel(value: number) {
    this.assertAlive();
    this.#borderSizePixel = Math.max(0, value);
    this.syncBorder();
  }
  public get BorderColor3(): Color3 {
    return this.#borderColor3;
  }
  public set BorderColor3(value: Color3) {
    this.assertAlive();
    this.#borderColor3 = value;
    this.syncBorder();
  }
  public get CornerRadius(): number {
    return this.#cornerRadius;
  }
  public set CornerRadius(value: number) {
    this.assertAlive();
    this.#cornerRadius = Math.max(0, value);
    this.Element.style.borderRadius = `${this.#cornerRadius}px`;
  }

  protected override onParentChanged(
    _previous: Instance | undefined,
    next: Instance | undefined,
  ): void {
    this.Element.remove();
    if (next instanceof ScreenGui) next._attach(this);
    else if (isDomBacked(next)) next.Element.append(this.Element);
  }

  protected override onDestroy(): void {
    this.Element.remove();
  }

  private syncStyle(): void {
    this.syncSize();
    this.syncPosition();
    this.syncColor();
    this.syncBorder();
    this.ClipsDescendants = this.#clipsDescendants;
    this.CornerRadius = this.#cornerRadius;
    this.Visible = this.#visible;
    this.ZIndex = this.#zIndex;
  }

  private syncSize(): void {
    this.Element.style.width =
      this.#automaticSize === 'X' || this.#automaticSize === 'XY'
        ? 'auto'
        : udimToCss(this.#size.X);
    this.Element.style.height =
      this.#automaticSize === 'Y' || this.#automaticSize === 'XY'
        ? 'auto'
        : udimToCss(this.#size.Y);
  }

  private syncPosition(): void {
    this.Element.style.left = udimToCss(this.#position.X);
    this.Element.style.top = udimToCss(this.#position.Y);
    this.Element.style.transform = `translate(${-this.#anchorPoint.X * 100}%, ${-this.#anchorPoint.Y * 100}%)`;
  }

  private syncColor(): void {
    this.Element.style.backgroundColor = this.#backgroundColor3.toCSS(this.#backgroundTransparency);
  }

  private syncBorder(): void {
    this.Element.style.borderStyle = this.#borderSizePixel > 0 ? 'solid' : 'none';
    this.Element.style.borderWidth = `${this.#borderSizePixel}px`;
    this.Element.style.borderColor = this.#borderColor3.toCSS();
  }
}
