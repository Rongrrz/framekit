import { Color3 } from '../primitives/Color3';
import { Frame } from './Frame';

export type TextXAlignment = 'Left' | 'Center' | 'Right';
export type TextYAlignment = 'Top' | 'Center' | 'Bottom';

export class TextLabel extends Frame {
  readonly #textElement: HTMLSpanElement;
  #text = '';
  #textColor3 = Color3.fromRGB(0, 0, 0);
  #textTransparency = 0;
  #textSize = 14;
  #textWrapped = false;
  #textXAlignment: TextXAlignment = 'Center';
  #textYAlignment: TextYAlignment = 'Center';

  public constructor(element: HTMLElement = document.createElement('div')) {
    super(element);
    this.#textElement = document.createElement('span');
    this.#textElement.dataset.framekitText = '';
    Object.assign(this.#textElement.style, {
      position: 'absolute',
      inset: '0',
      display: 'flex',
      pointerEvents: 'none',
      fontFamily: 'system-ui, sans-serif',
      lineHeight: '1.2',
    });
    this.Element.prepend(this.#textElement);
    this.syncTextStyle();
  }

  public get Text(): string {
    return this.#text;
  }
  public set Text(value: string) {
    this.assertAlive();
    this.#text = value;
    this.#textElement.textContent = value;
  }
  public get TextColor3(): Color3 {
    return this.#textColor3;
  }
  public set TextColor3(value: Color3) {
    this.assertAlive();
    this.#textColor3 = value;
    this.syncTextColor();
  }
  public get TextTransparency(): number {
    return this.#textTransparency;
  }
  public set TextTransparency(value: number) {
    this.assertAlive();
    this.#textTransparency = value;
    this.syncTextColor();
  }
  public get TextSize(): number {
    return this.#textSize;
  }
  public set TextSize(value: number) {
    this.assertAlive();
    this.#textSize = Math.max(0, value);
    this.#textElement.style.fontSize = `${this.#textSize}px`;
  }
  public get TextWrapped(): boolean {
    return this.#textWrapped;
  }
  public set TextWrapped(value: boolean) {
    this.assertAlive();
    this.#textWrapped = value;
    this.#textElement.style.whiteSpace = value ? 'normal' : 'nowrap';
  }
  public get TextXAlignment(): TextXAlignment {
    return this.#textXAlignment;
  }
  public set TextXAlignment(value: TextXAlignment) {
    this.assertAlive();
    this.#textXAlignment = value;
    this.syncAlignment();
  }
  public get TextYAlignment(): TextYAlignment {
    return this.#textYAlignment;
  }
  public set TextYAlignment(value: TextYAlignment) {
    this.assertAlive();
    this.#textYAlignment = value;
    this.syncAlignment();
  }
  public get FontFamily(): string {
    return this.#textElement.style.fontFamily;
  }
  public set FontFamily(value: string) {
    this.assertAlive();
    this.#textElement.style.fontFamily = value;
  }
  public get FontWeight(): string {
    return this.#textElement.style.fontWeight;
  }
  public set FontWeight(value: string | number) {
    this.assertAlive();
    this.#textElement.style.fontWeight = String(value);
  }

  private syncTextStyle(): void {
    this.Text = this.#text;
    this.TextSize = this.#textSize;
    this.TextWrapped = this.#textWrapped;
    this.syncTextColor();
    this.syncAlignment();
  }

  private syncTextColor(): void {
    this.#textElement.style.color = this.#textColor3.toCSS(this.#textTransparency);
  }

  private syncAlignment(): void {
    const horizontal = { Left: 'flex-start', Center: 'center', Right: 'flex-end' } as const;
    const vertical = { Top: 'flex-start', Center: 'center', Bottom: 'flex-end' } as const;
    this.#textElement.style.justifyContent = horizontal[this.#textXAlignment];
    this.#textElement.style.alignItems = vertical[this.#textYAlignment];
    this.#textElement.style.textAlign = this.#textXAlignment.toLowerCase();
  }
}
