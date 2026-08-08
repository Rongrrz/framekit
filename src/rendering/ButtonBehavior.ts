import { Signal } from '../core/Signal';
import { Frame } from '../gui/Frame';

type FrameConstructor = new (...args: any[]) => Frame;
type ButtonConstructor<Base extends FrameConstructor> = new (
  ...args: ConstructorParameters<Base>
) => InstanceType<Base> & ButtonCapability;

export interface ButtonCapability {
  readonly MouseButton1Click: Signal<[MouseEvent]>;
  readonly MouseButton1Down: Signal<[MouseEvent]>;
  readonly MouseButton1Up: Signal<[MouseEvent]>;
  readonly MouseButton2Click: Signal<[MouseEvent]>;
  readonly MouseButton2Down: Signal<[MouseEvent]>;
  readonly MouseButton2Up: Signal<[MouseEvent]>;
  readonly MouseEnter: Signal<[MouseEvent]>;
  readonly MouseLeave: Signal<[MouseEvent]>;
  Disabled: boolean;
}

export function withButtonBehavior<Base extends FrameConstructor>(
  BaseClass: Base,
): ButtonConstructor<Base> {
  class ButtonEnabled extends BaseClass {
    readonly #button: HTMLButtonElement;
    readonly #behavior: ButtonBehavior;

    public constructor(...args: any[]) {
      super(...args);
      if (!(this.Element instanceof HTMLButtonElement)) {
        throw new TypeError('Button-enabled UI objects must use an HTMLButtonElement.');
      }

      this.#button = this.Element;
      this.#button.type = 'button';
      this.#behavior = new ButtonBehavior(this.#button);
      Object.assign(this.#button.style, { padding: '0', cursor: 'pointer' });
    }

    public get MouseButton1Click(): Signal<[MouseEvent]> {
      return this.#behavior.MouseButton1Click;
    }
    public get MouseButton1Down(): Signal<[MouseEvent]> {
      return this.#behavior.MouseButton1Down;
    }
    public get MouseButton1Up(): Signal<[MouseEvent]> {
      return this.#behavior.MouseButton1Up;
    }
    public get MouseButton2Click(): Signal<[MouseEvent]> {
      return this.#behavior.MouseButton2Click;
    }
    public get MouseButton2Down(): Signal<[MouseEvent]> {
      return this.#behavior.MouseButton2Down;
    }
    public get MouseButton2Up(): Signal<[MouseEvent]> {
      return this.#behavior.MouseButton2Up;
    }
    public get MouseEnter(): Signal<[MouseEvent]> {
      return this.#behavior.MouseEnter;
    }
    public get MouseLeave(): Signal<[MouseEvent]> {
      return this.#behavior.MouseLeave;
    }
    public get Disabled(): boolean {
      return this.#button.disabled;
    }
    public set Disabled(value: boolean) {
      if (this.IsDestroyed) throw new Error(`${this.constructor.name} has been destroyed.`);
      this.#button.disabled = value;
    }

    protected override onDestroy(): void {
      this.#behavior.Destroy();
      super.onDestroy();
    }
  }

  return ButtonEnabled as unknown as ButtonConstructor<Base>;
}

class ButtonBehavior {
  public readonly MouseButton1Click = new Signal<[MouseEvent]>();
  public readonly MouseButton1Down = new Signal<[MouseEvent]>();
  public readonly MouseButton1Up = new Signal<[MouseEvent]>();
  public readonly MouseButton2Click = new Signal<[MouseEvent]>();
  public readonly MouseButton2Down = new Signal<[MouseEvent]>();
  public readonly MouseButton2Up = new Signal<[MouseEvent]>();
  public readonly MouseEnter = new Signal<[MouseEvent]>();
  public readonly MouseLeave = new Signal<[MouseEvent]>();

  readonly #abortController = new AbortController();
  #leftDown = false;
  #rightDown = false;

  public constructor(element: HTMLButtonElement) {
    const options = { signal: this.#abortController.signal };
    element.addEventListener('mousedown', this.onMouseDown, options);
    element.addEventListener('mouseup', this.onMouseUp, options);
    element.addEventListener('mouseenter', (event) => this.MouseEnter.Fire(event), options);
    element.addEventListener('mouseleave', (event) => this.MouseLeave.Fire(event), options);
    element.addEventListener('contextmenu', this.onContextMenu, options);
  }

  public Destroy(): void {
    this.#abortController.abort();
    this.MouseButton1Click.Destroy();
    this.MouseButton1Down.Destroy();
    this.MouseButton1Up.Destroy();
    this.MouseButton2Click.Destroy();
    this.MouseButton2Down.Destroy();
    this.MouseButton2Up.Destroy();
    this.MouseEnter.Destroy();
    this.MouseLeave.Destroy();
  }

  private readonly onMouseDown = (event: MouseEvent): void => {
    if (event.button === 0) {
      this.#leftDown = true;
      this.MouseButton1Down.Fire(event);
    } else if (event.button === 2) {
      this.#rightDown = true;
      this.MouseButton2Down.Fire(event);
    }
  };

  private readonly onMouseUp = (event: MouseEvent): void => {
    if (event.button === 0) {
      this.MouseButton1Up.Fire(event);
      if (this.#leftDown) this.MouseButton1Click.Fire(event);
      this.#leftDown = false;
    } else if (event.button === 2) {
      this.MouseButton2Up.Fire(event);
      if (this.#rightDown) this.MouseButton2Click.Fire(event);
      this.#rightDown = false;
    }
  };

  private readonly onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };
}
