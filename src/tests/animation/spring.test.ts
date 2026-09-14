import { describe, expect, it, vi } from 'vitest';

import { fk, fka } from '../../index';
import { setupAnimationClock } from '../support/animation-clock';

const { advance, settle } = setupAnimationClock();

describe('TweenService spring tweens', () => {
  it('retains one spring controller per node', () => {
    const frame = fk.createFrame();
    const controller = fk.spring(frame);

    expect(fk.spring(frame)).toBe(controller);
    expect(fk.spring(frame, { Rotation: 90 })).toBe(controller);
    expect(fk.spring(fk.createFrame())).not.toBe(controller);

    settle();

    expect(frame.Rotation).toBe(90);
    expect(controller.isAnimating()).toBe(false);
  });

  it('applies call settings only to properties in that goal', () => {
    const frame = fk.createFrame({ BackgroundTransparency: 0, Rotation: 0 });
    const control = fk.createFrame({ BackgroundTransparency: 0 });
    const slow = { tension: 40, friction: 12 } as const;

    fk.spring(frame, { BackgroundTransparency: 1 }, slow);
    fk.spring(control, { BackgroundTransparency: 1 }, slow);
    advance();
    fk.spring(frame, { Rotation: 90 }, { tension: 400, friction: 40, mass: 2 });
    advance();

    expect(frame.BackgroundTransparency).toBe(control.BackgroundTransparency);
    expect(frame.Rotation).toBeGreaterThan(0);

    settle();

    expect(frame).toMatchObject({ BackgroundTransparency: 1, Rotation: 90 });
  });

  it('springs numbers and structured values exactly to their goals', () => {
    const frame = fk.createFrame({
      Position: fk.udim2FromOffset(0, 0),
      Size: fk.udim2FromOffset(100, 100),
      BackgroundColor3: fk.color3FromRGB(0, 0, 0),
    });
    const controller = fk.spring(frame);
    const completed = vi.fn();

    expect(controller.completed).not.toHaveProperty('emit');
    expect(controller.completed).not.toHaveProperty('clear');

    controller.completed.subscribe(completed);
    fk.spring(frame, {
      Position: fk.udim2(0.5, 20, 0.25, -10),
      Size: fk.udim2FromOffset(240, 160),
      BackgroundColor3: fk.color3FromRGB(120, 80, 200),
      BackgroundTransparency: 0.6,
    });

    expect(controller.isAnimating()).toBe(true);

    settle();

    expect(frame).toMatchObject({
      Position: fk.udim2(0.5, 20, 0.25, -10),
      Size: fk.udim2FromOffset(240, 160),
      BackgroundColor3: fk.color3FromRGB(120, 80, 200),
      BackgroundTransparency: 0.6,
    });
    expect(controller.isAnimating()).toBe(false);
    expect(completed).toHaveBeenCalledOnce();
  });

  it('preserves velocity when retargeted', () => {
    const frame = fk.createFrame({ BackgroundTransparency: 0 });
    const settings = { tension: 170, friction: 5 } as const;

    fk.spring(frame, { BackgroundTransparency: 1 }, settings);
    for (let index = 0; index < 5; index += 1) advance();

    const beforeRetarget = frame.BackgroundTransparency;

    fk.spring(frame, { BackgroundTransparency: 0 }, settings);
    advance();

    expect(frame.BackgroundTransparency).toBeGreaterThan(beforeRetarget);

    settle();

    expect(frame.BackgroundTransparency).toBe(0);
  });

  it('arbitrates property ownership with tweens in both directions', () => {
    const frame = fk.createFrame({ BackgroundTransparency: 0 });
    const controller = fk.spring(frame);

    fk.spring(frame, { BackgroundTransparency: 1 });
    advance();

    const tween = fka.TweenService.create(frame, { Duration: 1 }, { BackgroundTransparency: 0.5 });

    tween.play();

    expect(controller.isAnimating()).toBe(false);

    fk.spring(frame, { BackgroundTransparency: 0.25 });

    expect(tween.playbackState()).toBe('Cancelled');

    settle();

    expect(frame.BackgroundTransparency).toBe(0.25);
  });

  it('lets direct property changes take control from active animations', () => {
    const frame = fk.createFrame({ Rotation: 0, BackgroundTransparency: 0 });
    const controller = fk.spring(frame);

    fk.spring(frame, { Rotation: 90 });
    advance();

    frame.Rotation = 12;

    expect(controller.isAnimating()).toBe(false);

    advance();

    expect(frame.Rotation).toBe(12);

    const tween = fka.TweenService.create(frame, { Duration: 1 }, { BackgroundTransparency: 1 });

    tween.play();
    advance();
    frame.setProperties({ BackgroundTransparency: 0.4 });

    expect(tween.playbackState()).toBe('Cancelled');
    expect(frame.BackgroundTransparency).toBe(0.4);
  });

  it('stops when a direct assignment keeps the current value', () => {
    const frame = fk.createFrame({ Rotation: 0 });
    const controller = fk.spring(frame);

    fk.spring(frame, { Rotation: 90 });
    frame.Rotation = 0;

    expect(controller.isAnimating()).toBe(false);
    expect(frame.Rotation).toBe(0);
  });

  it('keeps an animation when a rejected assignment never takes effect', () => {
    const scale = fk.createUIScale();
    const controller = fk.spring(scale);

    fk.spring(scale, { Scale: 2 });

    expect(() => (scale.Scale = -1)).toThrow(/non-negative finite/);
    expect(controller.isAnimating()).toBe(true);

    settle();

    expect(scale.Scale).toBe(2);
  });

  it('stops individual properties and releases everything on destruction', () => {
    const frame = fk.createFrame();
    const controller = fk.spring(frame);

    fk.spring(frame, {
      BackgroundTransparency: 1,
      Position: fk.udim2FromOffset(100, 100),
    });
    controller.stop('Position');

    expect(controller.isAnimating()).toBe(true);

    frame.destroy();

    expect(controller.isAnimating()).toBe(false);
    expect(() => fk.spring(frame, { BackgroundTransparency: 0 })).toThrow(/destroyed/);
  });

  it('validates options and spring goals', () => {
    const frame = fk.createFrame();

    expect(() => fk.spring(frame, { Rotation: 1 }, { tension: 0 })).toThrow(/tension/);
    expect(() => fk.spring(frame, { Rotation: 1 }, { friction: Number.NaN })).toThrow(/friction/);
    expect(() => fk.spring(frame, { Rotation: 1 }, { mass: 0 })).toThrow(/mass/);
    expect(() => fk.spring(frame, { Rotation: 1 }, { restVelocity: -1 })).toThrow(/rest velocity/);

    expect(() => fk.spring(frame, {})).toThrow(/goal property/);
    expect(() => fk.spring(frame, { Missing: 1 } as never)).toThrow(
      /Unknown spring property "Missing"/,
    );
    expect(() => fk.spring(frame, { BackgroundTransparency: Number.NaN })).toThrow(/animatable/);
  });

  it('rejects a goal that violates the property contract before scheduling it', () => {
    const frame = fk.createFrame();
    const scale = fk.createUIScale();

    frame.addChild(scale);

    const controller = fk.spring(scale);

    expect(() => fk.spring(scale, { Scale: -1 }, { tension: 170, friction: 5 })).toThrow(
      /invalid property values/,
    );
    expect(controller.isAnimating()).toBe(false);

    const replacement = fka.TweenService.create(scale, { Duration: 0 }, { Scale: 0.5 });

    replacement.play();

    expect(scale.Scale).toBe(0.5);
  });

  it('springs shadow properties through the same API', () => {
    const frame = fk.createFrame();
    const shadow = fk.createUIShadow();

    frame.addChild(shadow);
    fk.spring(shadow, {
      Offset: fk.vector2(12, 20),
      BlurRadius: 28,
      Transparency: 0.25,
    });
    settle();

    expect(shadow).toMatchObject({
      Offset: fk.vector2(12, 20),
      BlurRadius: 28,
      Transparency: 0.25,
    });
    expect(frame.element.style.boxShadow).toContain('12px 20px 28px 0px');
  });
});
