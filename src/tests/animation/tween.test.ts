import { describe, expect, it, vi } from 'vitest';

import { fk, fka } from '../../index';
import { setupAnimationClock } from '../support/animation-clock';
import { destroyNodesAfterEach } from '../support/node-cleanup';

const { advance } = setupAnimationClock();
const trackNode = destroyNodesAfterEach();

describe('tweens', () => {
  it('keeps active work when the browser frame function is replaced', () => {
    const first = trackNode(fk.createFrame({ Rotation: 0 }));
    const second = trackNode(fk.createFrame({ Rotation: 0 }));
    const firstTween = fka.createTween(
      first,
      { Duration: 1, EasingStyle: 'Linear' },
      { Rotation: 90 },
    );
    const secondTween = fka.createTween(
      second,
      { Duration: 1, EasingStyle: 'Linear' },
      { Rotation: 180 },
    );

    firstTween.play();
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    secondTween.play();
    advance(500);

    expect(first.Rotation).toBe(45);
    expect(second.Rotation).toBe(90);
  });

  it('restarts completed and cancelled playback from the latest property value', () => {
    const frame = trackNode(fk.createFrame({ Rotation: 0 }));
    const tween = fka.createTween(frame, { Duration: 1, EasingStyle: 'Linear' }, { Rotation: 90 });
    const completed = vi.fn();

    tween.completed.subscribe(completed);
    tween.play();
    advance(1000);

    expect(frame.Rotation).toBe(90);
    expect(tween.playbackState()).toBe('Completed');

    frame.Rotation = 30;
    tween.play();
    advance(500);

    expect(frame.Rotation).toBe(60);

    tween.cancel();
    frame.Rotation = 10;
    tween.play();
    advance(500);

    expect(frame.Rotation).toBe(50);

    advance(500);

    expect(frame.Rotation).toBe(90);
    expect(completed.mock.calls).toEqual([['Completed'], ['Cancelled'], ['Completed']]);
  });

  it('repeats indefinitely until explicitly cancelled', () => {
    const frame = trackNode(fk.createFrame({ Rotation: 0 }));
    const tween = fka.createTween(
      frame,
      { Duration: 1, EasingStyle: 'Linear', RepeatCount: -1, Reverses: true },
      { Rotation: 90 },
    );

    tween.play();
    advance(4500);

    expect(frame.Rotation).toBe(45);
    expect(tween.playbackState()).toBe('Playing');

    tween.cancel();
    advance(1000);

    expect(frame.Rotation).toBe(45);
    expect(tween.playbackState()).toBe('Cancelled');
  });

  it('interpolates numbers and structured FrameKit values', () => {
    const frame = trackNode(
      fk.createFrame({
        Position: fk.udim2FromOffset(0, 10),
        BackgroundColor3: fk.color3FromRGB(0, 50, 100),
      }),
    );
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

  it('constrains easing overshoot to a property domain', () => {
    const frame = trackNode(fk.createFrame({ BackgroundTransparency: 0 }));
    const tween = fka.createTween(
      frame,
      { Duration: 1, EasingStyle: 'Back', EasingDirection: 'Out' },
      { BackgroundTransparency: 1 },
    );

    tween.play();
    expect(() => advance(750)).not.toThrow();
    expect(frame.BackgroundTransparency).toBe(1);
  });

  it('supports delay, pause, resume, and cancellation', () => {
    const frame = trackNode(fk.createFrame({ BackgroundTransparency: 0 }));
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
    const frame = trackNode(fk.createFrame({ Rotation: 0 }));
    const tween = fka.createTween(frame, { Duration: 1 }, { Rotation: 90 });

    tween.play();
    advance(250);
    tween.pause();

    frame.Rotation = 12;

    expect(tween.playbackState()).toBe('Cancelled');
    expect(frame.Rotation).toBe(12);
  });

  it('returns to the start when reversing and completes repeats', () => {
    const frame = trackNode(fk.createFrame({ BackgroundTransparency: 0 }));
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
    const frame = trackNode(fk.createFrame());
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
    const frame = trackNode(fk.createFrame({ BackgroundTransparency: 0 }));
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
    const frame = trackNode(fk.createFrame());
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

  it('reports cancellation listener failures without changing destruction', () => {
    const frame = trackNode(fk.createFrame());
    const tween = fka.createTween(frame, { Duration: 1 }, { BackgroundTransparency: 1 });
    const reportError = vi.fn();
    const listener = vi.fn(() => {
      throw new Error('listener failed');
    });

    vi.stubGlobal('reportError', reportError);
    tween.completed.subscribe(listener);
    tween.play();

    expect(() => frame.destroy()).not.toThrow();
    expect(tween.playbackState()).toBe('Cancelled');
    expect(tween.completed).not.toHaveProperty('emit');
    expect(tween.completed).not.toHaveProperty('clear');
    expect(listener).toHaveBeenCalledOnce();
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'listener failed' }),
    );
  });

  it('keeps a direct property write in control when observers fail', () => {
    const frame = trackNode(fk.createFrame({ Rotation: 0 }));
    const tween = fka.createTween(frame, { Duration: 1 }, { Rotation: 90 });
    const reportError = vi.fn();
    const changed = vi.fn();

    vi.stubGlobal('reportError', reportError);
    tween.completed.subscribe(() => {
      throw new Error('cancel listener failed');
    });
    frame.onPropertyChanged('Rotation', () => {
      throw new Error('property listener failed');
    });
    frame.onPropertyChanged('Rotation', changed);
    tween.play();

    expect(() => (frame.Rotation = 10)).not.toThrow();
    expect(frame.Rotation).toBe(10);
    expect(tween.playbackState()).toBe('Cancelled');
    expect(changed).toHaveBeenCalledWith(10, 0);
    expect(reportError).toHaveBeenCalledTimes(2);
  });

  it('does not let completion observers block an ownership handoff', () => {
    const frame = trackNode(fk.createFrame({ Rotation: 0, BackgroundTransparency: 0 }));
    const existing = fka.createTween(frame, { Duration: 1 }, { BackgroundTransparency: 1 });
    const interrupted = fka.createTween(
      frame,
      { Duration: 1 },
      { Rotation: 90, BackgroundTransparency: 0.5 },
    );
    const reportError = vi.fn();

    vi.stubGlobal('reportError', reportError);
    existing.completed.subscribe(() => {
      throw new Error('cancel listener failed');
    });
    existing.play();

    expect(() => interrupted.play()).not.toThrow();
    expect(existing.playbackState()).toBe('Cancelled');
    expect(interrupted.playbackState()).toBe('Playing');
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'cancel listener failed' }),
    );
  });

  it('releases every directly assigned property when several cancellation listeners fail', () => {
    const frame = trackNode(fk.createFrame({ Rotation: 0, BackgroundTransparency: 0 }));
    const rotation = fka.createTween(frame, { Duration: 1 }, { Rotation: 90 });
    const transparency = fka.createTween(frame, { Duration: 1 }, { BackgroundTransparency: 1 });
    const reportError = vi.fn();

    vi.stubGlobal('reportError', reportError);
    rotation.completed.subscribe(() => {
      throw new Error('rotation cancellation failed');
    });
    transparency.completed.subscribe(() => {
      throw new Error('transparency cancellation failed');
    });
    rotation.play();
    transparency.play();

    expect(() => frame.setProperties({ Rotation: 10, BackgroundTransparency: 0.5 })).not.toThrow();
    expect(frame).toMatchObject({ Rotation: 10, BackgroundTransparency: 0.5 });
    expect(rotation.playbackState()).toBe('Cancelled');
    expect(transparency.playbackState()).toBe('Cancelled');
    expect(reportError).toHaveBeenCalledTimes(2);
  });

  it('validates tween configuration and goal values', () => {
    const frame = trackNode(fk.createFrame());

    expect(() => fka.createTween(frame, { Duration: -1 }, { Rotation: 1 })).toThrow(/duration/);
    expect(() => fka.createTween(frame, { Duration: 1, RepeatCount: -2 }, { Rotation: 1 })).toThrow(
      /repeat count/,
    );
    expect(() => fka.createTween(frame, { Duration: 1 }, {})).toThrow(/goal property/);
    expect(() => fka.createTween(frame, { Duration: 1 }, { Missing: 1 } as never)).toThrow(
      /Unknown tween property "Missing"/,
    );
    try {
      fka.createTween(
        frame,
        { Duration: 1 },
        {
          BackgroundTransparency: Number.NaN,
        },
      );
      throw new Error('Expected the invalid goal to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError);
      expect(error).toHaveProperty('message', expect.stringMatching(/compatible tweenable/));
      expect(error).toHaveProperty('cause', expect.any(TypeError));
    }
  });

  it('rejects a goal that violates the property contract before playback', () => {
    const frame = trackNode(fk.createFrame());
    const scale = trackNode(fk.createUIScale());

    scale.Parent = frame;

    expect(() => fka.createTween(scale, { Duration: 0 }, { Scale: -1 })).toThrow(
      /invalid property values/,
    );

    const valid = fka.createTween(scale, { Duration: 0 }, { Scale: 0.5 });

    valid.play();

    expect(valid.playbackState()).toBe('Completed');
    expect(scale.Scale).toBe(0.5);
  });
});
