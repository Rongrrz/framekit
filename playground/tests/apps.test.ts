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
    expect(app.findFirstChild('Motion', true)).toBeDefined();
    expect(app.findFirstChild('Modifiers', true)).toBeDefined();
    expect(app.findFirstChild('HeroPreview', true)).toBeDefined();
    expect(app.findFirstChild('ModifierDemo', true)).toBeDefined();
    expect(app.findFirstChild('ApiExplorer', true)).toBeDefined();
    expect(app.findFirstChild('Lifecycle', true)).toBeDefined();

    app.destroy();
  });

  it('resizes the same hierarchy when its responsive layout changes', () => {
    vi.stubGlobal('innerWidth', 900);
    const app = createPlaygroundApp();
    const content = app.findFirstChild('FrameKitPlaygroundContent', true)!;
    const contentScale = content.findFirstChild('UIScale') as fk.UIScale;
    const motion = app.findFirstChild('Motion', true);

    expect(contentScale.Scale).toBeCloseTo(900 / 1180);

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
});
