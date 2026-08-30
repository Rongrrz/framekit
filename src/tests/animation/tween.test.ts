import { describe, expect, it, vi } from 'vitest';

import { fk, fka } from '../..';
import { setupAnimationClock } from '../support/animation-clock';

const { advance } = setupAnimationClock();

describe('tweens', () => {
  it('interpolates numbers and structured FrameKit values', () => {
    const frame = fk.createFrame({
      Position: fk.udim2FromOffset(0, 10),
      BackgroundColor3: fk.color3FromRGB(0, 50, 100),
    });
    const tween = fka.createTween(
      frame,
      { Duration: 1, EasingStyle: 'Linear' },
      {
        Position: fk.udim2FromOffset(100, 30),
        BackgroundColor3: fk.color3FromRGB(100, 100, 200),
        BackgroundTransparency: 1,
      },
    );

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
    const tween = fka.createTween(
      frame,
      { Duration: 1, EasingStyle: 'Linear', EasingDirection: 'In', Delay: 0.25 },
      {
        BackgroundTransparency: 1,
      },
    );
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
    const tween = fka.createTween(frame, { Duration: 1 }, { Rotation: 90 });

    tween.play();
    advance(250);
    tween.pause();

    frame.Rotation = 12;

    expect(tween.playbackState()).toBe('Cancelled');
    expect(frame.Rotation).toBe(12);
  });

  it('returns to the start when reversing and completes repeats', () => {
    const frame = fk.createFrame({ BackgroundTransparency: 0 });
    const tween = fka.createTween(
      frame,
      {
        Duration: 0.1,
        EasingStyle: 'Linear',
        EasingDirection: 'In',
        RepeatCount: 1,
        Reverses: true,
      },
      {
        BackgroundTransparency: 1,
      },
    );

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
    const first = fka.createTween(frame, { Duration: 1 }, { BackgroundTransparency: 1 });
    const second = fka.createTween(frame, { Duration: 1 }, { BackgroundTransparency: 0.5 });
    const position = fka.createTween(
      frame,
      { Duration: 1 },
      {
        Position: fk.udim2FromOffset(100, 100),
      },
    );

    first.play();
    position.play();
    second.play();

    expect(first.playbackState()).toBe('Cancelled');
    expect(position.playbackState()).toBe('Playing');
    expect(second.playbackState()).toBe('Playing');
  });

  it('keeps ownership consistent when cancellation listeners start another tween', () => {
    const frame = fk.createFrame({ BackgroundTransparency: 0 });
    const first = fka.createTween(
      frame,
      { Duration: 1, EasingStyle: 'Linear' },
      {
        BackgroundTransparency: 1,
      },
    );
    const reentrant = fka.createTween(
      frame,
      { Duration: 1, EasingStyle: 'Linear' },
      {
        BackgroundTransparency: 0.75,
      },
    );
    const latest = fka.createTween(
      frame,
      { Duration: 1, EasingStyle: 'Linear' },
      {
        BackgroundTransparency: 0.5,
      },
    );

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
    const instant = fka.createTween(frame, { Duration: 0 }, { BackgroundTransparency: 1 });

    instant.play();

    expect(frame.BackgroundTransparency).toBe(1);
    expect(instant.playbackState()).toBe('Completed');

    const delayed = fka.createTween(
      frame,
      { Duration: 0, EasingStyle: 'Linear', EasingDirection: 'In', Delay: 0.1 },
      {
        BackgroundTransparency: 0.5,
      },
    );

    delayed.play();
    advance(100);

    expect(frame.BackgroundTransparency).toBe(0.5);
    expect(delayed.playbackState()).toBe('Completed');

    const running = fka.createTween(frame, { Duration: 1 }, { BackgroundTransparency: 0 });

    running.play();
    frame.destroy();

    expect(running.playbackState()).toBe('Cancelled');
    expect(() => running.play()).toThrow(/destroyed/);
  });

  it('finishes tween cleanup when a cancellation listener throws during destruction', () => {
    const frame = fk.createFrame();
    const tween = fka.createTween(frame, { Duration: 1 }, { BackgroundTransparency: 1 });
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

  it('keeps a direct property write in control when tween cancellation listeners fail', () => {
    const frame = fk.createFrame({ Rotation: 0 });
    const tween = fka.createTween(frame, { Duration: 1 }, { Rotation: 90 });
    const changed = vi.fn();

    tween.completed.subscribe(() => {
      throw new Error('cancel listener failed');
    });
    frame.onPropertyChanged('Rotation', changed);
    tween.play();

    expect(() => (frame.Rotation = 10)).toThrow(/cancel listener failed/);
    expect(frame.Rotation).toBe(10);
    expect(tween.playbackState()).toBe('Cancelled');
    expect(changed).toHaveBeenCalledWith(10, 0);
  });

  it('releases partial ownership when a multi-property claim fails', () => {
    const frame = fk.createFrame({ Rotation: 0, BackgroundTransparency: 0 });
    const existing = fka.createTween(frame, { Duration: 1 }, { BackgroundTransparency: 1 });
    const interrupted = fka.createTween(
      frame,
      { Duration: 1 },
      { Rotation: 90, BackgroundTransparency: 0.5 },
    );

    existing.completed.subscribe(() => {
      throw new Error('cancel listener failed');
    });
    existing.play();

    expect(() => interrupted.play()).toThrow(/cancel listener failed/);

    const replacement = fka.createTween(frame, { Duration: 1 }, { Rotation: 45 });

    expect(() => replacement.play()).not.toThrow();
    expect(replacement.playbackState()).toBe('Playing');
  });

  it('keeps ownership that a retained spring had before a failed claim', () => {
    const frame = fk.createFrame({ Rotation: 0, BackgroundTransparency: 0 });
    const controller = fka.spring(frame);
    const tween = fka.createTween(frame, { Duration: 1 }, { BackgroundTransparency: 1 });

    fka.spring(frame, { Rotation: 90 });
    tween.completed.subscribe(() => {
      throw new Error('cancel listener failed');
    });
    tween.play();

    expect(() =>
      fka.spring(frame, {
        Rotation: 45,
        BackgroundTransparency: 0.5,
      }),
    ).toThrow(/cancel listener failed/);

    const replacement = fka.createTween(frame, { Duration: 1 }, { Rotation: 20 });

    replacement.play();

    expect(controller.isAnimating()).toBe(false);
    expect(replacement.playbackState()).toBe('Playing');
  });

  it('releases every directly assigned property when several cancellation listeners fail', () => {
    const frame = fk.createFrame({ Rotation: 0, BackgroundTransparency: 0 });
    const rotation = fka.createTween(frame, { Duration: 1 }, { Rotation: 90 });
    const transparency = fka.createTween(frame, { Duration: 1 }, { BackgroundTransparency: 1 });

    rotation.completed.subscribe(() => {
      throw new Error('rotation cancellation failed');
    });
    transparency.completed.subscribe(() => {
      throw new Error('transparency cancellation failed');
    });
    rotation.play();
    transparency.play();

    expect(() => frame.setProperties({ Rotation: 10, BackgroundTransparency: 0.5 })).toThrow(
      /Multiple animations failed/,
    );
    expect(frame).toMatchObject({ Rotation: 10, BackgroundTransparency: 0.5 });
    expect(rotation.playbackState()).toBe('Cancelled');
    expect(transparency.playbackState()).toBe('Cancelled');
  });

  it('validates tween configuration and goal values', () => {
    const frame = fk.createFrame();

    expect(() => fka.createTween(frame, { Duration: -1 }, { Rotation: 1 })).toThrow(/duration/);
    expect(() => fka.createTween(frame, { Duration: 1, RepeatCount: -2 }, { Rotation: 1 })).toThrow(
      /repeat count/,
    );
    expect(() => fka.createTween(frame, { Duration: 1 }, {})).toThrow(/goal property/);
    expect(() => fka.createTween(frame, { Duration: 1 }, { Missing: 1 } as never)).toThrow(
      /Unknown tween property "Missing"/,
    );
    expect(() =>
      fka.createTween(
        frame,
        { Duration: 1 },
        {
          BackgroundTransparency: Number.NaN,
        },
      ),
    ).toThrow(/compatible tweenable/);
  });

  it('releases property ownership when rendering an animated value fails', () => {
    const frame = fk.createFrame();
    const scale = fk.createUIScale();

    frame.addChild(scale);

    const invalid = fka.createTween(scale, { Duration: 0 }, { Scale: -1 });

    expect(() => invalid.play()).toThrow(/non-negative finite/);
    expect(invalid.playbackState()).toBe('Cancelled');

    const valid = fka.createTween(scale, { Duration: 0 }, { Scale: 0.5 });

    valid.play();

    expect(valid.playbackState()).toBe('Completed');
    expect(scale.Scale).toBe(0.5);
  });
});
