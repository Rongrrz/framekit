import { fk } from 'framekit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  bindDocumentTheme,
  bindThemeTransition,
  resolveInitialTheme,
  themes,
  type ThemeMode,
} from '../src/theme';
import { installAnimationClock } from './support/animation-clock';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-framekit-theme');
  document.querySelector('meta[name="theme-color"]')?.remove();
});

describe('animated theme palette', () => {
  it('springs every consumer through one intermediate palette', () => {
    const clock = installAnimationClock();
    const owner = fk.createFrame();
    const mode = fk.createValue<ThemeMode>('dark');
    const palette = fk.createValue(themes.dark);
    bindThemeTransition(owner, mode, palette);

    mode.set('light');
    expect(palette.get()).toEqual(themes.dark);

    clock.advance();
    expect(palette.get()).not.toEqual(themes.dark);
    expect(palette.get()).not.toEqual(themes.light);

    clock.settle();
    expect(palette.get()).toEqual(themes.light);
    owner.destroy();
  });

  it('retargets the retained spring when the mode changes rapidly', () => {
    const clock = installAnimationClock();
    const owner = fk.createFrame();
    const mode = fk.createValue<ThemeMode>('dark');
    const palette = fk.createValue(themes.dark);
    bindThemeTransition(owner, mode, palette);

    mode.set('light');
    for (let frame = 0; frame < 8; frame += 1) clock.advance();
    mode.set('dark');
    clock.settle();

    expect(palette.get()).toEqual(themes.dark);
    owner.destroy();
    expect(document.documentElement.style.getPropertyValue('--pg-canvas')).toBe('');
  });

  it('switches immediately under reduced motion', () => {
    const clock = installAnimationClock();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const owner = fk.createFrame();
    const mode = fk.createValue<ThemeMode>('dark');
    const palette = fk.createValue(themes.dark);
    bindThemeTransition(owner, mode, palette);
    mode.set('light');
    expect(palette.get()).toEqual(themes.light);
    clock.settle();
    expect(palette.get()).toEqual(themes.light);
    owner.destroy();
  });

  it('stops an in-flight transition and its subscriptions on destruction', () => {
    const clock = installAnimationClock();
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    const owner = fk.createFrame();
    const mode = fk.createValue<ThemeMode>('dark');
    const palette = fk.createValue(themes.dark);
    bindThemeTransition(owner, mode, palette);
    mode.set('light');
    clock.advance();
    const lastPalette = palette.get();
    owner.destroy();
    clock.settle();
    mode.set('dark');
    expect(palette.get()).toBe(lastPalette);
    expect(reportError).not.toHaveBeenCalled();
    palette.set(themes.dark);
    expect(document.documentElement.style.getPropertyValue('--pg-canvas')).toBe('');
  });
});

describe('document theme', () => {
  it.each([
    ['dark', true, 'dark'],
    ['light', false, 'light'],
    ['invalid', true, 'light'],
    [null, false, 'dark'],
  ] as const)(
    'resolves stored %s with light preference %s to %s',
    (stored, prefersLight, expected) => {
      if (stored !== null) window.localStorage.setItem('framekit-playground-theme', stored);
      vi.stubGlobal('matchMedia', () => ({ matches: prefersLight }));
      expect(resolveInitialTheme()).toBe(expected);
    },
  );

  it('falls back to system preference when storage reads fail and to dark without matchMedia', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(resolveInitialTheme()).toBe('light');
    vi.stubGlobal('matchMedia', undefined);
    expect(resolveInitialTheme()).toBe('dark');
  });

  it.each([null, 'previous'])(
    'restores the previous document theme (%s) and meta color on destruction',
    (previous) => {
      if (previous !== null) document.documentElement.setAttribute('data-framekit-theme', previous);
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = '#123456';
      document.head.append(meta);
      const owner = fk.createFrame();
      const mode = fk.createValue<ThemeMode>('dark');
      bindDocumentTheme(owner, mode);
      expect(meta.content).toBe('#0a0d12');
      mode.set('light');
      expect(document.documentElement.getAttribute('data-framekit-theme')).toBe('light');
      expect(meta.content).toBe('#f5f7fa');
      expect(window.localStorage.getItem('framekit-playground-theme')).toBe('light');
      owner.destroy();
      mode.set('dark');
      expect(document.documentElement.getAttribute('data-framekit-theme')).toBe(previous);
      expect(meta.content).toBe('#123456');
      expect(window.localStorage.getItem('framekit-playground-theme')).toBe('light');
    },
  );

  it('keeps switching usable when storage writes fail', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const owner = fk.createFrame();
    const mode = fk.createValue<ThemeMode>('dark');
    expect(() => bindDocumentTheme(owner, mode)).not.toThrow();
    mode.set('light');
    expect(document.documentElement.getAttribute('data-framekit-theme')).toBe('light');
    owner.destroy();
  });
});
