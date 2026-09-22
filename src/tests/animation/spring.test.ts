import { describe, expect, it, vi } from 'vitest';

import {
  color3FromRGB,
  createFrame,
  createTween,
  createUIScale,
  createUIShadow,
  spring,
  udim2,
  udim2FromOffset,
  vector2,
} from '../../index.js';
import { setupAnimationClock } from '../support/animation-clock.js';
import { destroyNodesAfterEach } from '../support/node-cleanup.js';

const { advance, settle } = setupAnimationClock();
const trackNode = destroyNodesAfterEach();

describe('spring animations', () => {
  it('retains one spring controller per node', () => {
    const frame = trackNode(createFrame());
    const controller = spring(frame);

    expect(spring(frame)).toBe(controller);
    expect(spring(frame, { Rotation: 90 })).toBe(controller);
    expect(spring(trackNode(createFrame()))).not.toBe(controller);

    settle();

    expect(frame.Rotation).toBe(90);
    expect(controller.isAnimating()).toBe(false);
  });

  it('applies call settings only to properties in that goal', () => {
    const frame = trackNode(createFrame({ BackgroundTransparency: 0, Rotation: 0 }));
    const control = trackNode(createFrame({ BackgroundTransparency: 0 }));
    const slow = { tension: 40, friction: 12 } as const;

    spring(frame, { BackgroundTransparency: 1 }, slow);
    spring(control, { BackgroundTransparency: 1 }, slow);
    advance();
    spring(frame, { Rotation: 90 }, { tension: 400, friction: 40, mass: 2 });
    advance();

    expect(frame.BackgroundTransparency).toBe(control.BackgroundTransparency);
    expect(frame.Rotation).toBeGreaterThan(0);

    settle();

    expect(frame).toMatchObject({ BackgroundTransparency: 1, Rotation: 90 });
  });

  it('springs numbers and structured values exactly to their goals', () => {
    const frame = trackNode(
      createFrame({
        Position: udim2FromOffset(0, 0),
        Size: udim2FromOffset(100, 100),
        BackgroundColor3: color3FromRGB(0, 0, 0),
      }),
    );
    const controller = spring(frame);
    const completed = vi.fn();

    expect(controller.completed).not.toHaveProperty('emit');
    expect(controller.completed).not.toHaveProperty('clear');

    controller.completed.subscribe(completed);
    spring(frame, {
      Position: udim2(0.5, 20, 0.25, -10),
      Size: udim2FromOffset(240, 160),
      BackgroundColor3: color3FromRGB(120, 80, 200),
      BackgroundTransparency: 0.6,
    });

    expect(controller.isAnimating()).toBe(true);

    settle();

    expect(frame).toMatchObject({
      Position: udim2(0.5, 20, 0.25, -10),
      Size: udim2FromOffset(240, 160),
      BackgroundColor3: color3FromRGB(120, 80, 200),
      BackgroundTransparency: 0.6,
    });
    expect(controller.isAnimating()).toBe(false);
    expect(completed).toHaveBeenCalledOnce();
  });

  it('preserves velocity when retargeted', () => {
    const frame = trackNode(createFrame({ BackgroundTransparency: 0 }));
    const settings = { tension: 170, friction: 5 } as const;

    spring(frame, { BackgroundTransparency: 1 }, settings);
    for (let index = 0; index < 5; index += 1) advance();

    const beforeRetarget = frame.BackgroundTransparency;

    spring(frame, { BackgroundTransparency: 0 }, settings);
    advance();

    expect(frame.BackgroundTransparency).toBeGreaterThan(beforeRetarget);

    settle();

    expect(frame.BackgroundTransparency).toBe(0);
  });

  it.each([
    ['underdamped', 10],
    ['critically damped', 20],
    ['overdamped', 40],
  ] as const)('settles a %s spring exactly at its goal', (_, friction) => {
    const frame = trackNode(createFrame({ Rotation: 0 }));
    const controller = spring(frame, { Rotation: 90 }, { tension: 100, friction });
    advance();
    expect(frame.Rotation).toBeGreaterThan(0);
    expect(frame.Rotation).toBeLessThan(90);
    settle();
    expect(frame.Rotation).toBe(90);
    expect(controller.isAnimating()).toBe(false);
  });

  it('arbitrates property ownership with tweens in both directions', () => {
    const frame = trackNode(createFrame({ BackgroundTransparency: 0 }));
    const controller = spring(frame);

    spring(frame, { BackgroundTransparency: 1 });
    advance();

    const tween = createTween(frame, { Duration: 1 }, { BackgroundTransparency: 0.5 });

    tween.play();

    expect(controller.isAnimating()).toBe(false);

    spring(frame, { BackgroundTransparency: 0.25 });

    expect(tween.playbackState()).toBe('Cancelled');

    settle();

    expect(frame.BackgroundTransparency).toBe(0.25);
  });

  it('lets direct property changes take control from active animations', () => {
    const frame = trackNode(createFrame({ Rotation: 0, BackgroundTransparency: 0 }));
    const controller = spring(frame);

    spring(frame, { Rotation: 90 });
    advance();

    frame.Rotation = 12;

    expect(controller.isAnimating()).toBe(false);

    advance();

    expect(frame.Rotation).toBe(12);

    const tween = createTween(frame, { Duration: 1 }, { BackgroundTransparency: 1 });

    tween.play();
    advance();
    frame.setProperties({ BackgroundTransparency: 0.4 });

    expect(tween.playbackState()).toBe('Cancelled');
    expect(frame.BackgroundTransparency).toBe(0.4);
  });

  it('stops when a direct assignment keeps the current value', () => {
    const frame = trackNode(createFrame({ Rotation: 0 }));
    const controller = spring(frame);

    spring(frame, { Rotation: 90 });
    frame.Rotation = 0;

    expect(controller.isAnimating()).toBe(false);
    expect(frame.Rotation).toBe(0);
  });

  it('keeps an animation when a rejected assignment never takes effect', () => {
    const scale = trackNode(createUIScale());
    const controller = spring(scale);

    spring(scale, { Scale: 2 });

    expect(() => (scale.Scale = -1)).toThrow(/non-negative finite/);
    expect(controller.isAnimating()).toBe(true);

    settle();

    expect(scale.Scale).toBe(2);
  });

  it('stops individual properties and releases everything on destruction', () => {
    const frame = trackNode(createFrame());
    const controller = spring(frame);

    spring(frame, {
      BackgroundTransparency: 1,
      Position: udim2FromOffset(100, 100),
    });
    advance();
    const stoppedPosition = frame.Position;
    controller.stop('Position');

    expect(controller.isAnimating()).toBe(true);
    settle();
    expect(frame.Position).toEqual(stoppedPosition);
    expect(frame.BackgroundTransparency).toBe(1);
    spring(frame, { BackgroundTransparency: 0 });

    frame.destroy();

    expect(controller.isAnimating()).toBe(false);
    expect(() => spring(frame, { BackgroundTransparency: 0 })).toThrow(/destroyed/);
  });

  it('stops all properties without completing and can animate again', () => {
    const frame = trackNode(createFrame({ Rotation: 0 }));
    const controller = spring(frame, { Rotation: 90, BackgroundTransparency: 1 });
    const completed = vi.fn();
    controller.completed.subscribe(completed);
    advance();
    const rotation = frame.Rotation;
    controller.stop();
    controller.stop();
    settle();
    expect(controller.isAnimating()).toBe(false);
    expect(frame.Rotation).toBe(rotation);
    expect(completed).not.toHaveBeenCalled();
    spring(frame, { Rotation: 45 });
    settle();
    expect(frame.Rotation).toBe(45);
    expect(completed).toHaveBeenCalledOnce();
  });

  it('validates options and spring goals', () => {
    const frame = trackNode(createFrame());

    expect(() => spring(frame, { Rotation: 1 }, { tension: 0 })).toThrow(/tension/);
    expect(() => spring(frame, { Rotation: 1 }, { friction: Number.NaN })).toThrow(/friction/);
    expect(() => spring(frame, { Rotation: 1 }, { mass: 0 })).toThrow(/mass/);
    expect(() => spring(frame, { Rotation: 1 }, { restVelocity: -1 })).toThrow(/rest velocity/);

    expect(() => spring(frame, {})).toThrow(/goal property/);
    expect(() => spring(frame, { Missing: 1 } as never)).toThrow(
      /Unknown spring property "Missing"/,
    );
    expect(() => spring(frame, { BackgroundTransparency: Number.NaN })).toThrow(/animatable/);
  });

  it('rejects a goal that violates the property contract before scheduling it', () => {
    const frame = trackNode(createFrame());
    const scale = trackNode(createUIScale());

    scale.Parent = frame;

    const controller = spring(scale);

    expect(() => spring(scale, { Scale: -1 }, { tension: 170, friction: 5 })).toThrow(
      /invalid property values/,
    );
    expect(controller.isAnimating()).toBe(false);

    const replacement = createTween(scale, { Duration: 0 }, { Scale: 0.5 });

    replacement.play();

    expect(scale.Scale).toBe(0.5);
  });

  it('springs shadow properties through the same API', () => {
    const frame = trackNode(createFrame());
    const shadow = trackNode(createUIShadow());

    shadow.Parent = frame;
    spring(shadow, {
      Offset: vector2(12, 20),
      BlurRadius: 28,
      Transparency: 0.25,
    });
    settle();

    expect(shadow).toMatchObject({
      Offset: vector2(12, 20),
      BlurRadius: 28,
      Transparency: 0.25,
    });
    expect(frame.unsafeElement.style.boxShadow).toContain('12px 20px 28px 0px');
  });
});
