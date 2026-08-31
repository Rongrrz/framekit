import { fk } from 'framekit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { bindThemeTransition, themes, type ThemeMode } from '../src/theme';
import { installAnimationClock } from './support/animation-clock';

afterEach(() => {
  vi.unstubAllGlobals();
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
});
