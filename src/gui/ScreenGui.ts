import { Instance } from '../core/Instance';
import { isDomBacked } from '../rendering/dom';

export class ScreenGui extends Instance {
  readonly #element: HTMLDivElement;
  #mountTarget: HTMLElement | undefined;
  #enabled = true;
  #displayOrder = 0;

  public constructor() {
    super('ScreenGui');
    this.#element = document.createElement('div');
    this.#element.dataset.framekit = 'ScreenGui';
    Object.assign(this.#element.style, {
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
    });
  }

  public get Enabled(): boolean {
    return this.#enabled;
  }

  public set Enabled(value: boolean) {
    this.assertAlive();
    this.#enabled = value;
    this.#element.style.display = value ? '' : 'none';
  }

  public get DisplayOrder(): number {
    return this.#displayOrder;
  }

  public set DisplayOrder(value: number) {
    this.assertAlive();
    this.#displayOrder = value;
    this.#element.style.zIndex = String(value);
  }

  public get IsMounted(): boolean {
    return this.#mountTarget !== undefined;
  }

  public Mount(target: string | HTMLElement): void {
    this.assertAlive();
    const element =
      typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
    if (!element) throw new Error(`Unable to mount ScreenGui: target "${target}" was not found.`);
    if (this.#mountTarget === element) return;
    this.Unmount();
    this.#mountTarget = element;
    element.append(this.#element);
  }

  public Unmount(): void {
    this.#element.remove();
    this.#mountTarget = undefined;
  }

  public _attach(instance: Instance): void {
    if (isDomBacked(instance)) this.#element.append(instance.Element);
  }

  protected override onDestroy(): void {
    this.Unmount();
  }
}
