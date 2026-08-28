import { afterEach, describe, expect, it, vi } from 'vitest';

import { fk, fka } from '../../..';
import { resetDocumentAfterEach } from '../../shared/reset-document';

const { createScrollingFrame } = fk;
resetDocumentAfterEach();

afterEach(() => vi.unstubAllGlobals());

describe('scrolling frames', () => {
  it('maps scrolling direction to native overflow', () => {
    const scrolling = createScrollingFrame({ ScrollingDirection: 'Y' });

    expect(scrolling.element.style.overflowX).toBe('hidden');
    expect(scrolling.element.style.overflowY).toBe('auto');

    scrolling.setProperties({ ScrollingDirection: 'X' });

    expect(scrolling.element.style.overflowX).toBe('auto');
    expect(scrolling.element.style.overflowY).toBe('hidden');
  });

  it('reads and writes its canvas position as an ordinary property', () => {
    const scrolling = createScrollingFrame();

    scrolling.element.scrollLeft = 12;
    scrolling.element.scrollTop = 34;
    scrolling.element.dispatchEvent(new Event('scroll'));

    expect(scrolling.CanvasPosition).toEqual({ X: 12, Y: 34 });

    const nativeScrollTo = vi.fn();

    scrolling.element.scrollTo = nativeScrollTo;
    scrolling.CanvasPosition = fk.vector2(56, 78);

    expect(nativeScrollTo).toHaveBeenCalledWith(56, 78);
    expect(scrolling.CanvasPosition).toEqual(fk.vector2(56, 78));

    scrolling.destroy();

    expect(() => scrolling.CanvasPosition).toThrow(/destroyed/);

    scrolling.element.scrollTop = 90;

    expect(() => scrolling.element.dispatchEvent(new Event('scroll'))).not.toThrow();
  });

  it('gives native scrolling control over active springs and tweens', () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const springTarget = createScrollingFrame();
    const motion = fka.createMotion(springTarget);

    motion.spring({ CanvasPosition: fk.vector2(0, 200) });
    springTarget.element.dispatchEvent(new Event('scroll'));

    expect(motion.isAnimating()).toBe(true);

    springTarget.element.dispatchEvent(new WheelEvent('wheel', { deltaY: -10 }));

    expect(motion.isAnimating()).toBe(false);

    springTarget.element.scrollTop = 40;
    springTarget.element.dispatchEvent(new Event('scroll'));

    expect(springTarget.CanvasPosition).toEqual(fk.vector2(0, 40));

    const tweenTarget = createScrollingFrame();
    const tween = fka.createTween(tweenTarget, fka.tweenInfo(1), {
      CanvasPosition: fk.vector2(200, 0),
    });

    tween.play();
    tweenTarget.element.scrollLeft = 30;
    tweenTarget.element.dispatchEvent(new Event('scroll'));

    expect(tween.playbackState()).toBe('Cancelled');
    expect(tweenTarget.CanvasPosition).toEqual(fk.vector2(30, 0));
  });

  it('allows keyboard input from focused descendants to interrupt animation', () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const scrolling = createScrollingFrame();
    const child = document.createElement('button');

    scrolling.element.append(child);

    const motion = fka.createMotion(scrolling);

    motion.spring({ CanvasPosition: fk.vector2(0, 200) });
    child.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }));

    expect(scrolling.element.tabIndex).toBe(0);
    expect(motion.isAnimating()).toBe(false);
  });

  it('does not cancel an animation when the browser rounds its own scroll write', () => {
    let frame: FrameRequestCallback | undefined;

    vi.stubGlobal('performance', { now: () => 0 });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const scrolling = createScrollingFrame();

    scrolling.element.scrollTo = vi.fn((left?: number | ScrollToOptions, top?: number) => {
      if (typeof left !== 'number' || top === undefined) return;
      scrolling.element.scrollLeft = Math.round(left);
      scrolling.element.scrollTop = Math.round(top);
    });

    const motion = fka.createMotion(scrolling);

    motion.spring({ CanvasPosition: fk.vector2(0, 200) });
    frame?.(1000 / 60);

    expect(scrolling.CanvasPosition.Y).not.toBe(scrolling.element.scrollTop);

    scrolling.element.dispatchEvent(new Event('scroll'));

    expect(motion.isAnimating()).toBe(true);
  });

  it('treats a CanvasPosition assignment as an explicit animation interruption', () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const scrolling = createScrollingFrame();
    const motion = fka.createMotion(scrolling);

    motion.spring({ CanvasPosition: fk.vector2(0, 200) });
    scrolling.CanvasPosition = fk.vector2(0, 80);

    expect(motion.isAnimating()).toBe(false);
    expect(scrolling.CanvasPosition).toEqual(fk.vector2(0, 80));
  });
});
