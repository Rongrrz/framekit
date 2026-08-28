import { describe, expect, it, vi } from 'vitest';

import { fk, fka } from '../..';
import { setupAnimationClock } from '../shared/animation-clock';

const { advance } = setupAnimationClock();

describe('tweens', () => {
  it('interpolates numbers and structured FrameKit values', () => {
    const frame = fk.createFrame({
      Position: fk.udim2FromOffset(0, 10),
      BackgroundColor3: fk.color3FromRGB(0, 50, 100),
    });
    const tween = fka.createTween(frame, fka.tweenInfo(1, 'Linear'), {
      Position: fk.udim2FromOffset(100, 30),
      BackgroundColor3: fk.color3FromRGB(100, 100, 200),
      BackgroundTransparency: 1,
    });

    tween.play();
    advance(500);

    expect(frame).toMatchObject({
      Position: fk.udim2FromOffset(50, 20),
      BackgroundColor3: fk.color3FromRGB(50, 75, 150),
      BackgroundTransparency: 0.5,
    });
    expect(tween.playbackState()).toBe('Playing');

    advance(500);

    expect(frame.Position).toEqual(fk.udim2FromOffset(100, 30));
    expect(tween.playbackState()).toBe('Completed');
  });

  it('supports delay, pause, resume, and cancellation', () => {
    const frame = fk.createFrame({ BackgroundTransparency: 0 });
    const tween = fka.createTween(frame, fka.tweenInfo(1, 'Linear', 'In', 0, false, 0.25), {
      BackgroundTransparency: 1,
    });
    const completed = vi.fn();

    tween.completed.subscribe(completed);
    tween.play();
    advance(200);

    expect(tween.playbackState()).toBe('Delayed');
    expect(frame.BackgroundTransparency).toBe(0);

    tween.pause();
    advance(300);
    tween.play();
    advance(550);

    expect(frame.BackgroundTransparency).toBeCloseTo(0.5);

    tween.cancel();

    expect(tween.playbackState()).toBe('Cancelled');
    expect(completed).toHaveBeenCalledWith('Cancelled');
  });

  it('lets a direct assignment cancel a paused tween', () => {
    const frame = fk.createFrame({ Rotation: 0 });
    const tween = fka.createTween(frame, fka.tweenInfo(1), { Rotation: 90 });

    tween.play();
    advance(250);
    tween.pause();

    frame.Rotation = 12;

    expect(tween.playbackState()).toBe('Cancelled');
    expect(frame.Rotation).toBe(12);
  });

  it('returns to the start when reversing and completes repeats', () => {
    const frame = fk.createFrame({ BackgroundTransparency: 0 });
    const tween = fka.createTween(frame, fka.tweenInfo(0.1, 'Linear', 'In', 1, true), {
      BackgroundTransparency: 1,
    });

    tween.play();
    advance(100);

    expect(frame.BackgroundTransparency).toBe(1);

    advance(100);

    expect(frame.BackgroundTransparency).toBe(0);

    advance(100);

    expect(frame.BackgroundTransparency).toBe(1);

    advance(100);

    expect(frame.BackgroundTransparency).toBe(0);
    expect(tween.playbackState()).toBe('Completed');
  });

  it('cancels conflicting tweens but allows disjoint properties', () => {
    const frame = fk.createFrame();
    const first = fka.createTween(frame, fka.tweenInfo(1), { BackgroundTransparency: 1 });
    const second = fka.createTween(frame, fka.tweenInfo(1), { BackgroundTransparency: 0.5 });
    const position = fka.createTween(frame, fka.tweenInfo(1), {
      Position: fk.udim2FromOffset(100, 100),
    });

    first.play();
    position.play();
    second.play();

    expect(first.playbackState()).toBe('Cancelled');
    expect(position.playbackState()).toBe('Playing');
    expect(second.playbackState()).toBe('Playing');
  });

  it('keeps ownership consistent when cancellation listeners start another tween', () => {
    const frame = fk.createFrame({ BackgroundTransparency: 0 });
    const first = fka.createTween(frame, fka.tweenInfo(1, 'Linear'), {
      BackgroundTransparency: 1,
    });
    const reentrant = fka.createTween(frame, fka.tweenInfo(1, 'Linear'), {
      BackgroundTransparency: 0.75,
    });
    const latest = fka.createTween(frame, fka.tweenInfo(1, 'Linear'), {
      BackgroundTransparency: 0.5,
    });

    first.completed.subscribe(() => reentrant.play());
    first.play();
    latest.play();

    expect(first.playbackState()).toBe('Cancelled');
    expect(reentrant.playbackState()).toBe('Cancelled');
    expect(latest.playbackState()).toBe('Playing');

    advance(500);

    expect(frame.BackgroundTransparency).toBe(0.25);
  });

  it('finishes zero-duration tweens and cancels playback with node destruction', () => {
    const frame = fk.createFrame();
    const instant = fka.createTween(frame, fka.tweenInfo(0), { BackgroundTransparency: 1 });

    instant.play();

    expect(frame.BackgroundTransparency).toBe(1);
    expect(instant.playbackState()).toBe('Completed');

    const delayed = fka.createTween(frame, fka.tweenInfo(0, 'Linear', 'In', 0, false, 0.1), {
      BackgroundTransparency: 0.5,
    });

    delayed.play();
    advance(100);

    expect(frame.BackgroundTransparency).toBe(0.5);
    expect(delayed.playbackState()).toBe('Completed');

    const running = fka.createTween(frame, fka.tweenInfo(1), { BackgroundTransparency: 0 });

    running.play();
    frame.destroy();

    expect(running.playbackState()).toBe('Cancelled');
    expect(() => running.play()).toThrow(/destroyed/);
  });

  it('finishes tween cleanup when a cancellation listener throws during destruction', () => {
    const frame = fk.createFrame();
    const tween = fka.createTween(frame, fka.tweenInfo(1), { BackgroundTransparency: 1 });
    const listener = vi.fn(() => {
      throw new Error('listener failed');
    });

    tween.completed.subscribe(listener);
    tween.play();

    expect(() => frame.destroy()).toThrow(/listener failed/);
    expect(tween.playbackState()).toBe('Cancelled');
    expect(tween.completed).not.toHaveProperty('emit');
    expect(tween.completed).not.toHaveProperty('clear');
    expect(listener).toHaveBeenCalledOnce();
  });

  it('validates tween configuration and goal values', () => {
    const frame = fk.createFrame();

    expect(() => fka.tweenInfo(-1)).toThrow(/time/);
    expect(() => fka.tweenInfo(1, 'Linear', 'In', -2)).toThrow(/repeat count/);
    expect(() => fka.createTween(frame, fka.tweenInfo(1), {})).toThrow(/goal property/);
    expect(() =>
      fka.createTween(frame, fka.tweenInfo(1), {
        BackgroundTransparency: Number.NaN,
      }),
    ).toThrow(/compatible tweenable/);
  });

  it('releases property ownership when rendering an animated value fails', () => {
    const frame = fk.createFrame();
    const scale = fk.createUIScale();

    frame.addChild(scale);

    const invalid = fka.createTween(scale, fka.tweenInfo(0), { Scale: -1 });

    expect(() => invalid.play()).toThrow(/non-negative finite/);
    expect(invalid.playbackState()).toBe('Cancelled');

    const valid = fka.createTween(scale, fka.tweenInfo(0), { Scale: 0.5 });

    valid.play();

    expect(valid.playbackState()).toBe('Completed');
    expect(scale.Scale).toBe(0.5);
  });
});
