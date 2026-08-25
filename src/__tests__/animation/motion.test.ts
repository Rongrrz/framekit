import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fk } from '../..';

type FrameCallback = (timestamp: number) => void;

let clock = 0;
let nextFrame = 1;
let frames = new Map<number, FrameCallback>();

beforeEach(() => {
  clock = 0;
  nextFrame = 1;
  frames = new Map();
  vi.stubGlobal('performance', { now: () => clock });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameCallback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});

afterEach(() => vi.unstubAllGlobals());

function advance(milliseconds = 1000 / 60): void {
  clock += milliseconds;
  const pending = Array.from(frames.values());
  frames.clear();
  for (const callback of pending) callback(clock);
}

function settle(maximumFrames = 300): void {
  for (let index = 0; index < maximumFrames && frames.size > 0; index += 1) advance();
}

describe('motion springs', () => {
  it('springs numbers and structured values exactly to their goals', () => {
    const frame = fk.createFrame({
      Position: fk.udim2FromOffset(0, 0),
      Size: fk.udim2FromOffset(100, 100),
      BackgroundColor3: fk.color3(0, 0, 0),
    });
    const motion = fk.createMotion(frame);
    const completed = vi.fn();
    motion.completed.subscribe(completed);

    motion.spring({
      Position: fk.udim2(0.5, 20, 0.25, -10),
      Size: fk.udim2FromOffset(240, 160),
      BackgroundColor3: fk.color3(120, 80, 200),
      BackgroundTransparency: 0.6,
    });
    expect(motion.isAnimating()).toBe(true);
    settle();

    expect(fk.props(frame)).toMatchObject({
      Position: fk.udim2(0.5, 20, 0.25, -10),
      Size: fk.udim2FromOffset(240, 160),
      BackgroundColor3: fk.color3(120, 80, 200),
      BackgroundTransparency: 0.6,
    });
    expect(motion.isAnimating()).toBe(false);
    expect(completed).toHaveBeenCalledOnce();
  });

  it('preserves velocity when retargeted', () => {
    const frame = fk.createFrame({ BackgroundTransparency: 0 });
    const motion = fk.createMotion(frame, { tension: 170, friction: 5 });
    motion.spring({ BackgroundTransparency: 1 });
    for (let index = 0; index < 5; index += 1) advance();
    const beforeRetarget = fk.props(frame).BackgroundTransparency;

    motion.spring({ BackgroundTransparency: 0 });
    advance();

    expect(fk.props(frame).BackgroundTransparency).toBeGreaterThan(beforeRetarget);
    settle();
    expect(fk.props(frame).BackgroundTransparency).toBe(0);
  });

  it('arbitrates property ownership with tweens in both directions', () => {
    const frame = fk.createFrame({ BackgroundTransparency: 0 });
    const motion = fk.createMotion(frame);
    motion.spring({ BackgroundTransparency: 1 });
    advance();

    const tween = fk.createTween(frame, fk.tweenInfo(1), { BackgroundTransparency: 0.5 });
    tween.play();
    expect(motion.isAnimating()).toBe(false);

    motion.spring({ BackgroundTransparency: 0.25 });
    expect(tween.playbackState()).toBe('Cancelled');
    settle();
    expect(fk.props(frame).BackgroundTransparency).toBe(0.25);
  });

  it('stops individual properties and releases everything on destruction', () => {
    const frame = fk.createFrame();
    const motion = fk.createMotion(frame);
    motion.spring({
      BackgroundTransparency: 1,
      Position: fk.udim2FromOffset(100, 100),
    });
    motion.stop('Position');
    expect(motion.isAnimating()).toBe(true);

    fk.destroy(frame);
    expect(motion.isAnimating()).toBe(false);
    expect(() => motion.spring({ BackgroundTransparency: 0 })).toThrow(/destroyed/);
  });

  it('validates options and spring goals', () => {
    const frame = fk.createFrame();
    expect(() => fk.createMotion(frame, { tension: 0 })).toThrow(/tension/);
    expect(() => fk.createMotion(frame, { friction: Number.NaN })).toThrow(/friction/);
    const motion = fk.createMotion(frame);
    expect(() => motion.spring({})).toThrow(/goal property/);
    expect(() => motion.spring({ BackgroundTransparency: Number.NaN })).toThrow(/springable/);
  });
});
