import { Frame } from './Frame';

export type ScrollingDirection = 'X' | 'Y' | 'XY';

export class ScrollingFrame extends Frame {
  #scrollingDirection: ScrollingDirection = 'XY';

  public constructor() {
    super();
    this.ScrollingDirection = this.#scrollingDirection;
    this.Element.style.overscrollBehavior = 'contain';
  }

  public get ScrollingDirection(): ScrollingDirection {
    return this.#scrollingDirection;
  }
  public set ScrollingDirection(value: ScrollingDirection) {
    this.assertAlive();
    this.#scrollingDirection = value;
    this.Element.style.overflowX = value === 'X' || value === 'XY' ? 'auto' : 'hidden';
    this.Element.style.overflowY = value === 'Y' || value === 'XY' ? 'auto' : 'hidden';
  }
  public get CanvasPosition(): { X: number; Y: number } {
    return { X: this.Element.scrollLeft, Y: this.Element.scrollTop };
  }
  public set CanvasPosition(value: { X: number; Y: number }) {
    this.assertAlive();
    this.Element.scrollTo(value.X, value.Y);
  }
}
