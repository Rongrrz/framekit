import { createFrame, createObservableValue } from 'framekit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  bindDocumentTheme,
  bindThemePalette,
  resolveInitialTheme,
  themes,
  type ThemeMode,
} from '../src/theme';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-framekit-theme');
  document.querySelector('meta[name="theme-color"]')?.remove();
});

describe('theme palette', () => {
  it('switches both directions synchronously without intermediate palettes', () => {
    const owner = createFrame();
    const mode = createObservableValue<ThemeMode>('dark');
    const palette = createObservableValue(themes.dark);
    const changes = vi.fn();
    const stop = palette.onChange(changes);
    bindThemePalette(owner, mode, palette);

    mode.set('light');
    expect(palette.get()).toBe(themes.light);
    expect(document.documentElement.style.getPropertyValue('--pg-canvas')).toBe(
      'rgb(245 247 250 / 1)',
    );
    mode.set('dark');
    expect(palette.get()).toBe(themes.dark);
    expect(document.documentElement.style.getPropertyValue('--pg-canvas')).toBe(
      'rgb(10 13 18 / 1)',
    );
    expect(changes.mock.calls.map(([next]) => next)).toEqual([themes.light, themes.dark]);
    stop();
    owner.destroy();
  });

  it('releases its palette and document subscriptions on destruction', () => {
    const owner = createFrame();
    const mode = createObservableValue<ThemeMode>('dark');
    const palette = createObservableValue(themes.dark);
    bindThemePalette(owner, mode, palette);
    mode.set('light');
    owner.destroy();
    mode.set('dark');
    expect(palette.get()).toBe(themes.light);
    expect(document.documentElement.style.getPropertyValue('--pg-canvas')).toBe('');
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
      if (stored !== null) {
        window.localStorage.setItem('framekit-playground-theme', stored);
      }

      vi.stubGlobal('matchMedia', () => ({ matches: prefersLight }));
      expect(resolveInitialTheme()).toBe(expected);
    },
  );

  it('falls back to system preference when storage reads fail and to dark without matchMedia', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
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
      if (previous !== null) {
        document.documentElement.setAttribute('data-framekit-theme', previous);
      }

      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = '#123456';
      document.head.append(meta);

      const owner = createFrame();
      const mode = createObservableValue<ThemeMode>('dark');
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
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    const owner = createFrame();
    const mode = createObservableValue<ThemeMode>('dark');
    expect(() => bindDocumentTheme(owner, mode)).not.toThrow();
    mode.set('light');
    expect(document.documentElement.getAttribute('data-framekit-theme')).toBe('light');
    owner.destroy();
  });
});
