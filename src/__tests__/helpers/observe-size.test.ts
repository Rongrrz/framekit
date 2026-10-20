import { createFrame, observeSize, vector2 } from 'framekit';
import { expect, it, vi } from 'vitest';

import { setupAnimationClock } from '../support/animation-clock.js';
import { installResizeObserver } from '../support/resize-observer.js';

const clock = setupAnimationClock();

it('delivers size immediately, coalesces changed sizes, and stops with either GUI', () => {
  const resize = installResizeObserver();
  const owner = createFrame();
  const observed = createFrame();
  let width = 120;
  vi.spyOn(observed.unsafeElement, 'getBoundingClientRect').mockImplementation(
    () => ({ width, height: 80 }) as DOMRect,
  );
  const listener = vi.fn();
  observeSize(owner, listener, observed);
  expect(listener).toHaveBeenLastCalledWith(vector2(120, 80));
  width = 240;
  resize();
  width = 320;
  resize();
  clock.advance();
  expect(listener.mock.calls).toEqual([[vector2(120, 80)], [vector2(320, 80)]]);
  resize();
  clock.advance();
  expect(listener).toHaveBeenCalledTimes(2);
  width = 400;
  resize();
  observed.destroy();
  clock.advance();
  expect(listener).toHaveBeenCalledTimes(2);
  owner.destroy();
});

it('observes viewport height changes without a breakpoint change and disposes pending delivery', () => {
  const owner = createFrame();
  vi.stubGlobal('innerWidth', 800);
  vi.stubGlobal('innerHeight', 600);
  const listener = vi.fn();
  const dispose = observeSize(owner, listener, 'Viewport');
  vi.stubGlobal('innerHeight', 400);
  window.dispatchEvent(new Event('resize'));
  clock.advance();
  expect(listener).toHaveBeenLastCalledWith(vector2(800, 400));
  vi.stubGlobal('innerHeight', 300);
  window.dispatchEvent(new Event('resize'));
  dispose();
  dispose();
  clock.advance();
  expect(listener).toHaveBeenCalledTimes(2);
  owner.destroy();
});

it('releases setup when initial delivery throws or destroys the owner', () => {
  const resize = installResizeObserver();
  const owner = createFrame();
  const listener = vi.fn(() => {
    throw new Error('caller failed');
  });
  expect(() => observeSize(owner, listener)).toThrow('caller failed');
  resize();
  clock.advance();
  expect(listener).toHaveBeenCalledOnce();
  observeSize(owner, () => owner.destroy());
  resize();
  clock.advance();
  expect(() => observeSize(owner, listener)).toThrow(/live/);
});
