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

function advance(milliseconds: number): void {
  clock += milliseconds;
  const pending = Array.from(frames.values());
  frames.clear();
  for (const callback of pending) callback(clock);
}

describe('tweens', () => {
  it('interpolates numbers and structured FrameKit values', () => {
    const frame = fk.createFrame({
      Position: fk.udim2FromOffset(0, 10),
      BackgroundColor3: fk.color3(0, 50, 100),
    });
    const tween = fk.createTween(frame, fk.tweenInfo(1, 'Linear'), {
      Position: fk.udim2FromOffset(100, 30),
      BackgroundColor3: fk.color3(100, 100, 200),
      BackgroundTransparency: 1,
    });

    tween.play();
    advance(500);

    expect(fk.props(frame)).toMatchObject({
      Position: fk.udim2FromOffset(50, 20),
      BackgroundColor3: fk.color3(50, 75, 150),
      BackgroundTransparency: 0.5,
    });
    expect(tween.playbackState()).toBe('Playing');

    advance(500);
    expect(fk.props(frame).Position).toEqual(fk.udim2FromOffset(100, 30));
    expect(tween.playbackState()).toBe('Completed');
  });

  it('supports delay, pause, resume, and cancellation', () => {
    const frame = fk.createFrame({ BackgroundTransparency: 0 });
    const tween = fk.createTween(frame, fk.tweenInfo(1, 'Linear', 'In', 0, false, 0.25), {
      BackgroundTransparency: 1,
    });
    const completed = vi.fn();
    tween.completed.subscribe(completed);

    tween.play();
    advance(200);
    expect(tween.playbackState()).toBe('Delayed');
    expect(fk.props(frame).BackgroundTransparency).toBe(0);

    tween.pause();
    advance(300);
    tween.play();
    advance(550);
    expect(fk.props(frame).BackgroundTransparency).toBeCloseTo(0.5);

    tween.cancel();
    expect(tween.playbackState()).toBe('Cancelled');
    expect(completed).toHaveBeenCalledWith('Cancelled');
  });

  it('returns to the start when reversing and completes repeats', () => {
    const frame = fk.createFrame({ BackgroundTransparency: 0 });
    const tween = fk.createTween(frame, fk.tweenInfo(0.1, 'Linear', 'In', 1, true), {
      BackgroundTransparency: 1,
    });

    tween.play();
    advance(100);
    expect(fk.props(frame).BackgroundTransparency).toBe(1);
    advance(100);
    expect(fk.props(frame).BackgroundTransparency).toBe(0);
    advance(100);
    expect(fk.props(frame).BackgroundTransparency).toBe(1);
    advance(100);
    expect(fk.props(frame).BackgroundTransparency).toBe(0);
    expect(tween.playbackState()).toBe('Completed');
  });

  it('cancels conflicting tweens but allows disjoint properties', () => {
    const frame = fk.createFrame();
    const first = fk.createTween(frame, fk.tweenInfo(1), { BackgroundTransparency: 1 });
    const second = fk.createTween(frame, fk.tweenInfo(1), { BackgroundTransparency: 0.5 });
    const position = fk.createTween(frame, fk.tweenInfo(1), {
      Position: fk.udim2FromOffset(100, 100),
    });

    first.play();
    position.play();
    second.play();

    expect(first.playbackState()).toBe('Cancelled');
    expect(position.playbackState()).toBe('Playing');
    expect(second.playbackState()).toBe('Playing');
  });

  it('finishes zero-duration tweens and cancels playback with node destruction', () => {
    const frame = fk.createFrame();
    const instant = fk.createTween(frame, fk.tweenInfo(0), { BackgroundTransparency: 1 });
    instant.play();
    expect(fk.props(frame).BackgroundTransparency).toBe(1);
    expect(instant.playbackState()).toBe('Completed');

    const delayed = fk.createTween(frame, fk.tweenInfo(0, 'Linear', 'In', 0, false, 0.1), {
      BackgroundTransparency: 0.5,
    });
    delayed.play();
    advance(100);
    expect(fk.props(frame).BackgroundTransparency).toBe(0.5);
    expect(delayed.playbackState()).toBe('Completed');

    const running = fk.createTween(frame, fk.tweenInfo(1), { BackgroundTransparency: 0 });
    running.play();
    fk.destroy(frame);
    expect(running.playbackState()).toBe('Cancelled');
    expect(() => running.play()).toThrow(/destroyed/);
  });

  it('validates tween configuration and goal values', () => {
    const frame = fk.createFrame();
    expect(() => fk.tweenInfo(-1)).toThrow(/time/);
    expect(() => fk.tweenInfo(1, 'Linear', 'In', -2)).toThrow(/repeat count/);
    expect(() => fk.createTween(frame, fk.tweenInfo(1), {})).toThrow(/goal property/);
    expect(() =>
      fk.createTween(frame, fk.tweenInfo(1), {
        BackgroundTransparency: Number.NaN,
      }),
    ).toThrow(/compatible tweenable/);
  });
});
