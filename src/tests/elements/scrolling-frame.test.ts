import {
  color3FromRGB,
  createFrame,
  createScrollingFrame,
  createTween,
  spring,
  udim2FromOffset,
  vector2,
} from 'framekit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetDocumentAfterEach } from '../support/reset-document.js';

resetDocumentAfterEach();

afterEach(() => vi.unstubAllGlobals());

describe('scrolling frames', () => {
  it('uses a creation-only semantic host tag', () => {
    const main = createScrollingFrame({}, { tagName: 'main' });

    expect(main.unsafeElement.tagName).toBe('MAIN');
    expect(() => createScrollingFrame({}, { tagName: 'footer' } as never)).toThrow(/tagName/);
  });

  it('maps scrolling direction to native overflow', () => {
    const scrolling = createScrollingFrame({ ScrollingDirection: 'Y' });

    expect(scrolling.unsafeElement.style.overflowX).toBe('hidden');
    expect(scrolling.unsafeElement.style.overflowY).toBe('auto');
    expect(scrolling.unsafeElement.style.overscrollBehaviorX).toBe('auto');
    expect(scrolling.unsafeElement.style.overscrollBehaviorY).toBe('none');

    scrolling.setProperties({ ScrollingDirection: 'X' });

    expect(scrolling.unsafeElement.style.overflowX).toBe('auto');
    expect(scrolling.unsafeElement.style.overflowY).toBe('hidden');
    expect(scrolling.unsafeElement.style.overscrollBehaviorX).toBe('none');
    expect(scrolling.unsafeElement.style.overscrollBehaviorY).toBe('auto');

    scrolling.ScrollingEnabled = false;

    expect(scrolling.unsafeElement.style.overscrollBehaviorX).toBe('auto');
    expect(scrolling.unsafeElement.style.overscrollBehaviorY).toBe('auto');
  });

  it('hands unsupported keyboard scrolling to the nearest eligible ancestor', () => {
    const page = createScrollingFrame({ ScrollingDirection: 'Y' });
    const section = createFrame();
    const code = createScrollingFrame({ ScrollingDirection: 'X' });
    section.Parent = page;
    code.Parent = section;
    Object.defineProperty(page.unsafeElement, 'clientHeight', { configurable: true, value: 480 });
    page.unsafeElement.scrollTop = 120;
    page.unsafeElement.dispatchEvent(new Event('scroll'));

    const pageDown = new KeyboardEvent('keydown', {
      key: 'PageDown',
      bubbles: true,
      cancelable: true,
    });
    code.unsafeElement.dispatchEvent(pageDown);

    expect(pageDown.defaultPrevented).toBe(true);
    expect(page.CanvasPosition).toEqual(vector2(0, 600));
    expect(code.CanvasPosition).toEqual(vector2(0, 0));

    const arrowRight = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    code.unsafeElement.dispatchEvent(arrowRight);

    expect(arrowRight.defaultPrevented).toBe(false);
    expect(page.CanvasPosition).toEqual(vector2(0, 600));

    const input = document.createElement('input');
    code.unsafeElement.append(input);
    const inputPageDown = new KeyboardEvent('keydown', {
      key: 'PageDown',
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(inputPageDown);

    expect(inputPageDown.defaultPrevented).toBe(false);
    expect(page.CanvasPosition).toEqual(vector2(0, 600));
  });

  it('configures canvas sizing, native scrolling, and scrollbar appearance', () => {
    const scrolling = createScrollingFrame({
      CanvasSize: udim2FromOffset(600, 900),
      AutomaticCanvasSize: 'X',
      ScrollBarImageColor3: color3FromRGB(18, 153, 98),
      ScrollBarImageTransparency: 0.25,
      ScrollBarThickness: 6,
    });
    const canvasBounds = scrolling.unsafeElement.querySelector<HTMLElement>(
      '[data-framekit-canvas-bounds]',
    );

    expect(canvasBounds?.style.width).toBe('0px');
    expect(canvasBounds?.style.height).toBe('900px');
    expect(scrolling.unsafeElement.style.getPropertyValue('--framekit-scrollbar-thickness')).toBe(
      '6px',
    );
    expect(scrolling.unsafeElement.style.getPropertyValue('--framekit-scrollbar-color')).toBe(
      'rgb(18 153 98 / 0.75)',
    );
    expect(scrolling.unsafeElement.style.getPropertyValue('scrollbar-width')).toBe('thin');
    expect(document.querySelector('[data-framekit-styles]')?.textContent).toContain(
      '[data-framekit="ScrollingFrame"]::-webkit-scrollbar-thumb',
    );

    scrolling.ScrollingEnabled = false;

    expect(scrolling.unsafeElement.style.overflowX).toBe('hidden');
    expect(scrolling.unsafeElement.style.overflowY).toBe('hidden');

    expect(() => scrolling.setProperties({ ScrollBarImageTransparency: 1.1 })).toThrow(
      /between 0 and 1/,
    );
  });

  it('exposes canvas geometry and direct scroll helpers', () => {
    const scrolling = createScrollingFrame();

    Object.defineProperties(scrolling.unsafeElement, {
      scrollWidth: { configurable: true, value: 640 },
      scrollHeight: { configurable: true, value: 480 },
      clientWidth: { configurable: true, value: 240 },
      clientHeight: { configurable: true, value: 180 },
    });

    scrolling.scrollTo(vector2(20, 30));
    scrolling.scrollBy(vector2(5, -10));

    expect(scrolling.CanvasPosition).toEqual(vector2(25, 20));
    expect(scrolling.AbsoluteCanvasSize).toEqual(vector2(640, 480));
    expect(scrolling.MaxCanvasPosition).toEqual(vector2(400, 300));
  });

  it('reads and writes its canvas position as an ordinary property', () => {
    const scrolling = createScrollingFrame();

    scrolling.unsafeElement.scrollLeft = 12;
    scrolling.unsafeElement.scrollTop = 34;
    scrolling.unsafeElement.dispatchEvent(new Event('scroll'));

    expect(scrolling.CanvasPosition).toEqual({ X: 12, Y: 34 });

    const nativeScrollTo = vi.fn((left?: number | ScrollToOptions, top?: number) => {
      if (typeof left !== 'number' || top === undefined) {
        return;
      }
      scrolling.unsafeElement.scrollLeft = left;
      scrolling.unsafeElement.scrollTop = top;
    });

    scrolling.unsafeElement.scrollTo = nativeScrollTo as typeof scrolling.unsafeElement.scrollTo;
    scrolling.CanvasPosition = vector2(56, 78);

    expect(nativeScrollTo).toHaveBeenCalledWith(56, 78);
    expect(scrolling.CanvasPosition).toEqual(vector2(56, 78));

    scrolling.destroy();

    expect(() => scrolling.CanvasPosition).toThrow(/destroyed/);

    scrolling.unsafeElement.scrollTop = 90;

    expect(() => scrolling.unsafeElement.dispatchEvent(new Event('scroll'))).not.toThrow();
  });

  it('gives native scrolling control over active springs and tweens', () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const springTarget = createScrollingFrame();
    const controller = spring(springTarget);

    spring(springTarget, { CanvasPosition: vector2(0, 200) });
    springTarget.unsafeElement.dispatchEvent(new Event('scroll'));

    expect(controller.isAnimating()).toBe(true);

    springTarget.unsafeElement.dispatchEvent(new WheelEvent('wheel', { deltaY: -10 }));

    expect(controller.isAnimating()).toBe(true);

    springTarget.unsafeElement.scrollTop = 40;
    springTarget.unsafeElement.dispatchEvent(new Event('scroll'));

    expect(controller.isAnimating()).toBe(false);
    expect(springTarget.CanvasPosition).toEqual(vector2(0, 40));

    const tweenTarget = createScrollingFrame();
    const tween = createTween(
      tweenTarget,
      { Duration: 1 },
      {
        CanvasPosition: vector2(200, 0),
      },
    );

    tween.play();
    tweenTarget.unsafeElement.scrollLeft = 30;
    tweenTarget.unsafeElement.dispatchEvent(new Event('scroll'));

    expect(tween.playbackState()).toBe('Cancelled');
    expect(tweenTarget.CanvasPosition).toEqual(vector2(30, 0));
  });

  it('waits for keyboard scrolling to change CanvasPosition before interrupting animation', () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const scrolling = createScrollingFrame();
    const child = document.createElement('button');

    scrolling.unsafeElement.append(child);

    const controller = spring(scrolling);

    spring(scrolling, { CanvasPosition: vector2(0, 200) });
    child.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }));

    expect(scrolling.unsafeElement.tabIndex).toBe(0);
    expect(controller.isAnimating()).toBe(true);

    scrolling.unsafeElement.scrollTop = 20;
    scrolling.unsafeElement.dispatchEvent(new Event('scroll'));

    expect(controller.isAnimating()).toBe(false);
  });

  it('reports the browser position without cancelling an animation when a scroll write is rounded', () => {
    let frame: FrameRequestCallback | undefined;

    vi.stubGlobal('performance', { now: () => 0 });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const scrolling = createScrollingFrame();

    scrolling.unsafeElement.scrollTo = vi.fn((left?: number | ScrollToOptions, top?: number) => {
      if (typeof left !== 'number' || top === undefined) {
        return;
      }
      scrolling.unsafeElement.scrollLeft = Math.round(left);
      scrolling.unsafeElement.scrollTop = Math.round(top);
    });

    const controller = spring(scrolling);

    spring(scrolling, { CanvasPosition: vector2(0, 200) });
    frame?.(1000 / 60);

    expect(scrolling.CanvasPosition.Y).toBe(scrolling.unsafeElement.scrollTop);

    scrolling.unsafeElement.dispatchEvent(new Event('scroll'));

    expect(controller.isAnimating()).toBe(true);
  });

  it('treats a CanvasPosition assignment as an explicit animation interruption', () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const scrolling = createScrollingFrame();
    const controller = spring(scrolling);

    spring(scrolling, { CanvasPosition: vector2(0, 200) });
    scrolling.CanvasPosition = vector2(0, 80);

    expect(controller.isAnimating()).toBe(false);
    expect(scrolling.CanvasPosition).toEqual(vector2(0, 80));
  });
});
