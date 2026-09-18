import { afterEach, describe, expect, it, vi } from 'vitest';

import { fk, fka } from '../../../index';
import { resetDocumentAfterEach } from '../../support/reset-document';

resetDocumentAfterEach();

afterEach(() => vi.unstubAllGlobals());

describe('scrolling frames', () => {
  it('uses a creation-only semantic host tag', () => {
    const main = fk.createScrollingFrame({}, { tagName: 'main' });

    expect(main.unsafeElement.tagName).toBe('MAIN');
    expect(() => fk.createScrollingFrame({}, { tagName: 'footer' } as never)).toThrow(/tagName/);
  });

  it('maps scrolling direction to native overflow', () => {
    const scrolling = fk.createScrollingFrame({ ScrollingDirection: 'Y' });

    expect(scrolling.unsafeElement.style.overscrollBehavior).toBe('none');
    expect(scrolling.unsafeElement.style.overflowX).toBe('hidden');
    expect(scrolling.unsafeElement.style.overflowY).toBe('auto');

    scrolling.setProperties({ ScrollingDirection: 'X' });

    expect(scrolling.unsafeElement.style.overflowX).toBe('auto');
    expect(scrolling.unsafeElement.style.overflowY).toBe('hidden');
  });

  it('configures canvas sizing, native scrolling, and scrollbar appearance', () => {
    const scrolling = fk.createScrollingFrame({
      CanvasSize: fk.udim2FromOffset(600, 900),
      AutomaticCanvasSize: 'X',
      ScrollBarImageColor3: fk.color3FromRGB(18, 153, 98),
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
    const scrolling = fk.createScrollingFrame();

    Object.defineProperties(scrolling.unsafeElement, {
      scrollWidth: { configurable: true, value: 640 },
      scrollHeight: { configurable: true, value: 480 },
      clientWidth: { configurable: true, value: 240 },
      clientHeight: { configurable: true, value: 180 },
    });

    scrolling.scrollTo(fk.vector2(20, 30));
    scrolling.scrollBy(fk.vector2(5, -10));

    expect(scrolling.CanvasPosition).toEqual(fk.vector2(25, 20));
    expect(scrolling.AbsoluteCanvasSize).toEqual(fk.vector2(640, 480));
    expect(scrolling.MaxCanvasPosition).toEqual(fk.vector2(400, 300));
  });

  it('reads and writes its canvas position as an ordinary property', () => {
    const scrolling = fk.createScrollingFrame();

    scrolling.unsafeElement.scrollLeft = 12;
    scrolling.unsafeElement.scrollTop = 34;
    scrolling.unsafeElement.dispatchEvent(new Event('scroll'));

    expect(scrolling.CanvasPosition).toEqual({ X: 12, Y: 34 });

    const nativeScrollTo = vi.fn((left?: number | ScrollToOptions, top?: number) => {
      if (typeof left !== 'number' || top === undefined) return;
      scrolling.unsafeElement.scrollLeft = left;
      scrolling.unsafeElement.scrollTop = top;
    });

    scrolling.unsafeElement.scrollTo = nativeScrollTo as typeof scrolling.unsafeElement.scrollTo;
    scrolling.CanvasPosition = fk.vector2(56, 78);

    expect(nativeScrollTo).toHaveBeenCalledWith(56, 78);
    expect(scrolling.CanvasPosition).toEqual(fk.vector2(56, 78));

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

    const springTarget = fk.createScrollingFrame();
    const controller = fka.spring(springTarget);

    fka.spring(springTarget, { CanvasPosition: fk.vector2(0, 200) });
    springTarget.unsafeElement.dispatchEvent(new Event('scroll'));

    expect(controller.isAnimating()).toBe(true);

    springTarget.unsafeElement.dispatchEvent(new WheelEvent('wheel', { deltaY: -10 }));

    expect(controller.isAnimating()).toBe(true);

    springTarget.unsafeElement.scrollTop = 40;
    springTarget.unsafeElement.dispatchEvent(new Event('scroll'));

    expect(controller.isAnimating()).toBe(false);
    expect(springTarget.CanvasPosition).toEqual(fk.vector2(0, 40));

    const tweenTarget = fk.createScrollingFrame();
    const tween = fka.createTween(
      tweenTarget,
      { Duration: 1 },
      {
        CanvasPosition: fk.vector2(200, 0),
      },
    );

    tween.play();
    tweenTarget.unsafeElement.scrollLeft = 30;
    tweenTarget.unsafeElement.dispatchEvent(new Event('scroll'));

    expect(tween.playbackState()).toBe('Cancelled');
    expect(tweenTarget.CanvasPosition).toEqual(fk.vector2(30, 0));
  });

  it('waits for keyboard scrolling to change CanvasPosition before interrupting animation', () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const scrolling = fk.createScrollingFrame();
    const child = document.createElement('button');

    scrolling.unsafeElement.append(child);

    const controller = fka.spring(scrolling);

    fka.spring(scrolling, { CanvasPosition: fk.vector2(0, 200) });
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

    const scrolling = fk.createScrollingFrame();

    scrolling.unsafeElement.scrollTo = vi.fn((left?: number | ScrollToOptions, top?: number) => {
      if (typeof left !== 'number' || top === undefined) return;
      scrolling.unsafeElement.scrollLeft = Math.round(left);
      scrolling.unsafeElement.scrollTop = Math.round(top);
    });

    const controller = fka.spring(scrolling);

    fka.spring(scrolling, { CanvasPosition: fk.vector2(0, 200) });
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

    const scrolling = fk.createScrollingFrame();
    const controller = fka.spring(scrolling);

    fka.spring(scrolling, { CanvasPosition: fk.vector2(0, 200) });
    scrolling.CanvasPosition = fk.vector2(0, 80);

    expect(controller.isAnimating()).toBe(false);
    expect(scrolling.CanvasPosition).toEqual(fk.vector2(0, 80));
  });
});
