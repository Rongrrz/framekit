import { fk } from 'framekit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlaygroundApp } from '../src/app';

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('playground application', () => {
  it('composes one hierarchy for every viewport', () => {
    const app = createPlaygroundApp();
    app.mount(document.body);

    expect(document.querySelectorAll('[data-framekit="ScreenGui"]')).toHaveLength(1);
    expect(app.findFirstChild('HeroMachine', true)).toBeDefined();
    expect(app.findFirstChild('SpringReactor', true)).toBeDefined();
    expect(app.findFirstChild('MagneticMenu', true)).toBeDefined();
    expect(app.findFirstChild('MotionGrammar', true)).toBeDefined();
    expect(app.findFirstChild('LifecycleScene', true)).toBeDefined();
    expect(
      (app.findFirstChild('FrameKitPlaygroundPage', true) as fk.ScrollingFrame).ScrollBarThickness,
    ).toBe(0);

    app.destroy();
  });

  it('resizes the same hierarchy when its responsive layout changes', () => {
    vi.stubGlobal('innerWidth', 900);
    const app = createPlaygroundApp();
    const content = app.findFirstChild('FrameKitPlaygroundContent', true)!;
    const contentScale = content.findFirstChild('UIScale') as fk.UIScale;
    const motion = app.findFirstChild('Motion', true);

    expect(contentScale.Scale).toBeCloseTo(900 / 1280);

    vi.stubGlobal('innerWidth', 640);
    window.dispatchEvent(new Event('resize'));

    expect(contentScale.Scale).toBe(1);
    expect(app.findFirstChild('Motion', true)).toBe(motion);

    app.destroy();
    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();
  });

  it('keeps a forced preview layout independent of viewport breakpoints', () => {
    vi.stubGlobal('innerWidth', 900);
    const app = createPlaygroundApp('mobile');
    const content = app.findFirstChild('FrameKitPlaygroundContent', true)!;
    const contentScale = content.findFirstChild('UIScale') as fk.UIScale;

    window.dispatchEvent(new Event('resize'));

    expect(contentScale.Scale).toBe(1);

    app.destroy();
  });

  it('extends section backgrounds across wide viewports', () => {
    vi.stubGlobal('innerWidth', 1600);
    const app = createPlaygroundApp('desktop');
    const content = app.findFirstChild('FrameKitPlaygroundContent', true) as fk.Frame;
    const hero = app.findFirstChild('Hero', true) as fk.Frame;
    const heroContent = hero.findFirstChild('Content') as fk.Frame;

    expect(content.Size).toEqual(fk.udim2FromOffset(1600, content.Size.Y.Offset));
    expect(hero.Size.X).toEqual(fk.udim(1, 0));
    expect(heroContent.Position.X).toEqual(fk.udim(0.5, 0));

    app.destroy();
  });
});
