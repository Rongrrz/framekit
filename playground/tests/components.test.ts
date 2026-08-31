import { fk } from 'framekit';
import { describe, expect, it } from 'vitest';

import { createGuide } from '../src/components/guide';
import { createHero } from '../src/components/hero';
import type { PlaygroundLayout } from '../src/layout';
import type { ThemeMode } from '../src/theme';

const createTheme = (): fk.Value<ThemeMode> => fk.createValue('dark');

describe('playground components', () => {
  it('reflows the same scaled hero between layouts', () => {
    const layout = fk.createValue<PlaygroundLayout>('mobile');
    const hero = createHero(layout, createTheme(), () => undefined);
    const preview = hero.findFirstChild('HeroApiPreview', true) as fk.Frame;
    const title = hero.findFirstChild('HeroTitle', true) as fk.TextLabel;

    expect(preview.Size).toEqual(fk.udim2FromOffset(358, 318));
    expect(title.TextScaled).toBe(true);

    layout.set('desktop');

    expect(hero.findFirstChild('HeroApiPreview', true)).toBe(preview);
    expect(hero.findFirstChild('HeroTitle', true)).toBe(title);
    expect(preview.Size).toEqual(fk.udim2FromOffset(540, 580));
    hero.destroy();
  });

  it('presents the core model before optional APIs', () => {
    const guide = createGuide(fk.createValue<PlaygroundLayout>('desktop'), createTheme());

    expect(guide.findFirstChild('CreateCard', true)).toBeDefined();
    expect(guide.findFirstChild('ChangeCard', true)).toBeDefined();
    expect(guide.findFirstChild('ConnectCard', true)).toBeDefined();
    expect(guide.findFirstChild('CleanUpCard', true)).toBeDefined();
    expect(guide.element.textContent).toContain('OPTIONAL BY DESIGN');
    expect(guide.element.textContent).toContain('fka.spring()');
    guide.destroy();
  });
});
