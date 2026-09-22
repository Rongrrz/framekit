import {
  color3FromRGB,
  type Frame,
  type ScrollingFrame,
  type TextButton,
  type TextLabel,
  udim2FromOffset,
} from 'framekit';
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
    const siteRoots = Array.from(document.querySelectorAll('[data-framekit="ScreenGui"]')).filter(
      (element) => !element.querySelector('[role="tooltip"], [role="group"]'),
    );
    expect(siteRoots).toEqual([app.unsafeElement]);
    for (const name of [
      'ThemeToggleButton',
      'ToolTipExample1',
      'ToolTipExample2',
      'ToolTipExample3',
    ]) {
      const button = app.findFirstChild(name, true) as TextButton;
      const id = button.unsafeElement.getAttribute('aria-describedby');
      expect(id).toBeTruthy();
      expect(document.getElementById(id!)?.getAttribute('role')).toBe('tooltip');
    }
    for (const name of ['PopoverExample1', 'PopoverExample2']) {
      const button = app.findFirstChild(name, true) as TextButton;
      const id = button.unsafeElement.getAttribute('aria-controls');
      expect(document.getElementById(id!)?.querySelectorAll('button')).toHaveLength(3);
      expect(button.unsafeElement.getAttribute('aria-expanded')).toBe('false');
    }
    expect((app.findFirstChild('HomePage', true) as Frame).Visible).toBe(true);
    expect((app.findFirstChild('GuidePage', true) as Frame).Visible).toBe(false);
    expect((app.findFirstChild('ApiPage', true) as Frame).Visible).toBe(false);
    expect((app.findFirstChild('HomeProductName', true) as TextLabel).TextScaled).toBe(true);
    const page = app.findFirstChild('FrameKitPlaygroundPage', true) as ScrollingFrame;
    expect(page.ScrollBarThickness).toBe(12);
    expect(page.ScrollBarImageColor3).toEqual(color3FromRGB(105, 120, 137));
    expect(page.ScrollBarImageTransparency).toBe(0);
    app.destroy();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(document.querySelector('[data-framekit="ScreenGui"]')).toBeNull();
  });

  it('navigates between persistent pages without rebuilding them', () => {
    const app = createPlaygroundApp('desktop', 'dark');
    const home = app.findFirstChild('HomePage', true) as Frame;
    const guide = app.findFirstChild('GuidePage', true) as Frame;
    (app.findFirstChild('GuideNavButton', true) as TextButton).unsafeElement.click();
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
    const page = app.findFirstChild('FrameKitPlaygroundPage', true) as ScrollingFrame;
    const toggle = app.findFirstChild('ThemeToggleButton', true) as TextButton;
    toggle.unsafeElement.click();
    expect(document.documentElement.dataset.framekitTheme).toBe('light');
    expect(toggle.Text).toContain('Dark');
    expect(page.BackgroundColor3).toEqual(color3FromRGB(245, 247, 250));
    expect(page.ScrollBarImageColor3).toEqual(color3FromRGB(121, 136, 151));
    expect(window.localStorage.getItem('framekit-playground-theme')).toBe('light');
    app.destroy();
  });

  it('resizes the same hierarchy at the responsive breakpoint', () => {
    vi.stubGlobal('innerWidth', 1440);
    const app = createPlaygroundApp(undefined, 'dark');
    const visual = app.findFirstChild('HomeCodeVisual', true) as Frame;
    vi.stubGlobal('innerWidth', 640);
    window.dispatchEvent(new Event('resize'));
    expect(app.findFirstChild('HomeCodeVisual', true)).toBe(visual);
    expect(visual.Size).toEqual(udim2FromOffset(358, 370));
    expect((app.findFirstChild('BrandName', true) as TextLabel).Visible).toBe(false);
    app.destroy();
  });
});
