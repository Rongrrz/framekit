import { fk } from 'framekit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlaygroundApp } from '../src/app';

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-framekit-theme');
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe('playground application', () => {
  it('composes one API-focused hierarchy with a styled native scrollbar', () => {
    const app = createPlaygroundApp('desktop', 'dark');
    app.mount(document.body);

    expect(document.querySelectorAll('[data-framekit="ScreenGui"]')).toHaveLength(1);
    expect(app.findFirstChild('HeroApiPreview', true)).toBeDefined();
    expect(app.findFirstChild('Guide', true)).toBeDefined();
    expect(app.findFirstChild('CreateCard', true)).toBeDefined();
    expect(app.findFirstChild('ExtrasPanel', true)).toBeDefined();
    expect(app.findFirstChild('FooterCard', true)).toBeDefined();
    expect((app.findFirstChild('HeroTitle', true) as fk.TextLabel).TextScaled).toBe(true);
    expect((app.findFirstChild('GuideTitle', true) as fk.TextLabel).TextScaled).toBe(true);
    expect((app.findFirstChild('FooterTitle', true) as fk.TextLabel).TextScaled).toBe(true);
    const page = app.findFirstChild('FrameKitPlaygroundPage', true) as fk.ScrollingFrame;
    expect(page.ScrollBarThickness).toBe(12);
    expect(page.element.classList.contains('pg-scroll')).toBe(true);

    app.destroy();
  });

  it('switches every themed surface from one theme value', () => {
    const themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    themeColor.content = '#0a0d12';
    document.head.append(themeColor);
    const app = createPlaygroundApp('desktop', 'dark');
    const page = app.findFirstChild('FrameKitPlaygroundPage', true) as fk.ScrollingFrame;
    const toggle = app.findFirstChild('ThemeToggleButton', true) as fk.TextButton;

    expect(document.documentElement.dataset.framekitTheme).toBe('dark');
    expect(page.BackgroundColor3).toEqual(fk.color3FromRGB(10, 13, 18));

    toggle.element.click();

    expect(document.documentElement.dataset.framekitTheme).toBe('light');
    expect(themeColor.content).toBe('#f5f7fa');
    expect(toggle.Text).toContain('DARK');
    expect(page.BackgroundColor3).toEqual(fk.color3FromRGB(245, 247, 250));
    expect(window.localStorage.getItem('framekit-playground-theme')).toBe('light');

    app.destroy();
    expect(themeColor.content).toBe('#0a0d12');
    themeColor.remove();
  });

  it('resizes the same hierarchy when its responsive layout changes', () => {
    vi.stubGlobal('innerWidth', 900);
    const app = createPlaygroundApp(undefined, 'dark');
    const content = app.findFirstChild('FrameKitPlaygroundContent', true)!;
    const contentScale = content.findFirstChild('UIScale') as fk.UIScale;
    const guide = app.findFirstChild('Guide', true);

    expect(contentScale.Scale).toBeCloseTo((900 - 12) / 1280);

    vi.stubGlobal('innerWidth', 640);
    window.dispatchEvent(new Event('resize'));

    expect(contentScale.Scale).toBe(1);
    expect(app.findFirstChild('Guide', true)).toBe(guide);

    app.destroy();
    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();
  });

  it('keeps a forced preview layout independent of viewport breakpoints', () => {
    vi.stubGlobal('innerWidth', 900);
    const app = createPlaygroundApp('mobile', 'dark');
    const content = app.findFirstChild('FrameKitPlaygroundContent', true)!;
    const contentScale = content.findFirstChild('UIScale') as fk.UIScale;

    window.dispatchEvent(new Event('resize'));

    expect(contentScale.Scale).toBe(1);
    app.destroy();
  });

  it('centers content within the width left by the scrollbar gutter', () => {
    vi.stubGlobal('innerWidth', 1600);
    const app = createPlaygroundApp('desktop', 'dark');
    const content = app.findFirstChild('FrameKitPlaygroundContent', true) as fk.Frame;
    const hero = app.findFirstChild('Hero', true) as fk.Frame;
    const heroContent = hero.findFirstChild('Content') as fk.Frame;

    expect(content.Size.X).toEqual(fk.udim(0, 1588));
    expect(hero.Size.X).toEqual(fk.udim(1, 0));
    expect(heroContent.Position.X).toEqual(fk.udim(0.5, 0));

    app.destroy();
  });
});
