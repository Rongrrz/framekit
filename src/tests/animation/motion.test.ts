import { describe, expect, it, vi } from 'vitest';

import { fk, fka } from '../..';
import { setupAnimationClock } from '../shared/animation-clock';

const { advance, settle } = setupAnimationClock();

describe('motion springs', () => {
  it('retains a spring per node through the top-level API', () => {
    const frame = fk.createFrame({ BackgroundTransparency: 0 });
    const settings = { tension: 170, friction: 5 } as const;

    fka.spring(frame, { BackgroundTransparency: 1 }, settings);
    for (let index = 0; index < 5; index += 1) advance();

    const beforeRetarget = frame.BackgroundTransparency;

    fka.spring(frame, { BackgroundTransparency: 0 }, settings);
    advance();

    expect(frame.BackgroundTransparency).toBeGreaterThan(beforeRetarget);

    settle();

    expect(frame.BackgroundTransparency).toBe(0);
  });

  it('applies call settings only to properties in that goal', () => {
    const frame = fk.createFrame({ BackgroundTransparency: 0, Rotation: 0 });
    const control = fk.createFrame({ BackgroundTransparency: 0 });
    const slow = { tension: 40, friction: 12 } as const;

    fka.spring(frame, { BackgroundTransparency: 1 }, slow);
    fka.spring(control, { BackgroundTransparency: 1 }, slow);
    advance();
    fka.spring(frame, { Rotation: 90 }, { tension: 400, friction: 40, mass: 2 });
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
    const motion = fka.createMotion(frame);
    const completed = vi.fn();

    expect(motion.completed).not.toHaveProperty('emit');
    expect(motion.completed).not.toHaveProperty('clear');

    motion.completed.subscribe(completed);
    motion.spring({
      Position: fk.udim2(0.5, 20, 0.25, -10),
      Size: fk.udim2FromOffset(240, 160),
      BackgroundColor3: fk.color3FromRGB(120, 80, 200),
      BackgroundTransparency: 0.6,
    });

    expect(motion.isAnimating()).toBe(true);

    settle();

    expect(frame).toMatchObject({
      Position: fk.udim2(0.5, 20, 0.25, -10),
      Size: fk.udim2FromOffset(240, 160),
      BackgroundColor3: fk.color3FromRGB(120, 80, 200),
      BackgroundTransparency: 0.6,
    });
    expect(motion.isAnimating()).toBe(false);
    expect(completed).toHaveBeenCalledOnce();
  });

  it('preserves velocity when retargeted', () => {
    const frame = fk.createFrame({ BackgroundTransparency: 0 });
    const motion = fka.createMotion(frame, { tension: 170, friction: 5 });

    motion.spring({ BackgroundTransparency: 1 });
    for (let index = 0; index < 5; index += 1) advance();

    const beforeRetarget = frame.BackgroundTransparency;

    motion.spring({ BackgroundTransparency: 0 });
    advance();

    expect(frame.BackgroundTransparency).toBeGreaterThan(beforeRetarget);

    settle();

    expect(frame.BackgroundTransparency).toBe(0);
  });

  it('arbitrates property ownership with tweens in both directions', () => {
    const frame = fk.createFrame({ BackgroundTransparency: 0 });
    const motion = fka.createMotion(frame);

    motion.spring({ BackgroundTransparency: 1 });
    advance();

    const tween = fka.createTween(frame, fka.tweenInfo(1), { BackgroundTransparency: 0.5 });

    tween.play();

    expect(motion.isAnimating()).toBe(false);

    motion.spring({ BackgroundTransparency: 0.25 });

    expect(tween.playbackState()).toBe('Cancelled');

    settle();

    expect(frame.BackgroundTransparency).toBe(0.25);
  });

  it('lets direct property changes take control from active animations', () => {
    const frame = fk.createFrame({ Rotation: 0, BackgroundTransparency: 0 });
    const motion = fka.createMotion(frame);

    motion.spring({ Rotation: 90 });
    advance();

    frame.Rotation = 12;

    expect(motion.isAnimating()).toBe(false);

    advance();

    expect(frame.Rotation).toBe(12);

    const tween = fka.createTween(frame, fka.tweenInfo(1), { BackgroundTransparency: 1 });

    tween.play();
    advance();
    frame.setProperties({ BackgroundTransparency: 0.4 });

    expect(tween.playbackState()).toBe('Cancelled');
    expect(frame.BackgroundTransparency).toBe(0.4);
  });

  it('keeps an animation when a rejected assignment never takes effect', () => {
    const scale = fk.createUIScale();
    const motion = fka.createMotion(scale);

    motion.spring({ Scale: 2 });

    expect(() => (scale.Scale = -1)).toThrow(/non-negative finite/);
    expect(motion.isAnimating()).toBe(true);

    settle();

    expect(scale.Scale).toBe(2);
  });

  it('stops individual properties and releases everything on destruction', () => {
    const frame = fk.createFrame();
    const motion = fka.createMotion(frame);

    motion.spring({
      BackgroundTransparency: 1,
      Position: fk.udim2FromOffset(100, 100),
    });
    motion.stop('Position');

    expect(motion.isAnimating()).toBe(true);

    frame.destroy();

    expect(motion.isAnimating()).toBe(false);
    expect(() => motion.spring({ BackgroundTransparency: 0 })).toThrow(/destroyed/);
  });

  it('validates options and spring goals', () => {
    const frame = fk.createFrame();

    expect(() => fka.createMotion(frame, { tension: 0 })).toThrow(/tension/);
    expect(() => fka.createMotion(frame, { friction: Number.NaN })).toThrow(/friction/);
    expect(() => fka.spring(frame, { Rotation: 1 }, { mass: 0 })).toThrow(/mass/);
    expect(() => fka.spring(frame, { Rotation: 1 }, { restVelocity: -1 })).toThrow(/rest velocity/);

    const motion = fka.createMotion(frame);

    expect(() => motion.spring({})).toThrow(/goal property/);
    expect(() => motion.spring({ BackgroundTransparency: Number.NaN })).toThrow(/animatable/);
  });

  it('releases property ownership when a spring update cannot render', () => {
    const frame = fk.createFrame();
    const scale = fk.createUIScale();

    frame.addChild(scale);

    const motion = fka.createMotion(scale, { tension: 170, friction: 5 });

    motion.spring({ Scale: -1 });

    expect(() => settle()).toThrow(/non-negative finite/);
    expect(motion.isAnimating()).toBe(false);

    const replacement = fka.createTween(scale, fka.tweenInfo(0), { Scale: 0.5 });

    replacement.play();

    expect(scale.Scale).toBe(0.5);
  });

  it('springs shadow and glow properties through the same motion API', () => {
    const frame = fk.createFrame();
    const shadow = fk.createUIShadow();
    const glow = fk.createUIGlow();

    frame.addChild(shadow);
    frame.addChild(glow);
    fka.createMotion(shadow).spring({
      Offset: fk.vector2(12, 20),
      BlurRadius: 28,
      Transparency: 0.25,
    });
    fka.createMotion(glow).spring({ Radius: 32, Color: fk.color3FromRGB(120, 90, 255) });
    settle();

    expect(shadow).toMatchObject({
      Offset: fk.vector2(12, 20),
      BlurRadius: 28,
      Transparency: 0.25,
    });
    expect(glow).toMatchObject({
      Radius: 32,
      Color: fk.color3FromRGB(120, 90, 255),
    });
    expect(frame.element.style.boxShadow).toContain('12px 20px 28px 0px');
    expect(frame.element.style.filter).toContain('drop-shadow(0px 0px 32px');
  });
});
