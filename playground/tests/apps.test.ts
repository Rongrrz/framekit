import { fk } from 'framekit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlaygroundApp } from '../src/app';

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-framekit-theme');
  window.localStorage.clear();
  window.location.hash = '';
  vi.unstubAllGlobals();
});

describe('playground application', () => {
  it('creates one persistent routed site and a styled native scrollbar', () => {
    const app = createPlaygroundApp('desktop', 'dark');
    app.mount(document.body);
    expect(document.querySelectorAll('[data-framekit="ScreenGui"]')).toHaveLength(1);
    expect((app.findFirstChild('HomePage', true) as fk.Frame).Visible).toBe(true);
    expect((app.findFirstChild('GuidePage', true) as fk.Frame).Visible).toBe(false);
    expect((app.findFirstChild('ApiPage', true) as fk.Frame).Visible).toBe(false);
    expect((app.findFirstChild('HomeProductName', true) as fk.TextLabel).TextScaled).toBe(true);
    const page = app.findFirstChild('FrameKitPlaygroundPage', true) as fk.ScrollingFrame;
    expect(page.ScrollBarThickness).toBe(12);
    expect(page.element.dataset.framekitScrollingFrame).toBe('');
    app.destroy();
  });

  it('navigates between persistent pages without rebuilding them', () => {
    const app = createPlaygroundApp('desktop', 'dark');
    const home = app.findFirstChild('HomePage', true) as fk.Frame;
    const guide = app.findFirstChild('GuidePage', true) as fk.Frame;
    (app.findFirstChild('GuideNavButton', true) as fk.TextButton).element.click();
    expect(window.location.hash).toBe('#/guide');
    expect(home.Visible).toBe(false);
    expect(app.findFirstChild('GuidePage', true)).toBe(guide);
    expect(guide.Visible).toBe(true);
    app.destroy();
  });

  it('switches every themed surface from one theme value', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    }));
    const app = createPlaygroundApp('desktop', 'dark');
    const page = app.findFirstChild('FrameKitPlaygroundPage', true) as fk.ScrollingFrame;
    const toggle = app.findFirstChild('ThemeToggleButton', true) as fk.TextButton;
    toggle.element.click();
    expect(document.documentElement.dataset.framekitTheme).toBe('light');
    expect(toggle.Text).toContain('Dark');
    expect(page.BackgroundColor3).toEqual(fk.color3FromRGB(245, 247, 250));
    expect(window.localStorage.getItem('framekit-playground-theme')).toBe('light');
    app.destroy();
  });

  it('resizes the same hierarchy at the responsive breakpoint', () => {
    vi.stubGlobal('innerWidth', 900);
    const app = createPlaygroundApp(undefined, 'dark');
    const visual = app.findFirstChild('HomeCodeVisual', true) as fk.Frame;
    vi.stubGlobal('innerWidth', 640);
    window.dispatchEvent(new Event('resize'));
    expect(app.findFirstChild('HomeCodeVisual', true)).toBe(visual);
    expect(visual.Size).toEqual(fk.udim2FromOffset(358, 370));
    expect((app.findFirstChild('BrandName', true) as fk.TextLabel).Visible).toBe(false);
    app.destroy();
  });
});
