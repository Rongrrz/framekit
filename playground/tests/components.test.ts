import { fk } from 'framekit';
import { describe, expect, it } from 'vitest';

import { createApiPage } from '../src/components/api-page';
import { createGuidePage } from '../src/components/guide-page';
import { createHomePage } from '../src/components/home';
import type { PlaygroundLayout } from '../src/layout';
import type { SitePage } from '../src/router';
import type { ThemeMode } from '../src/theme';

const createState = (page: SitePage) => ({
  layout: fk.createValue<PlaygroundLayout>('desktop'),
  theme: fk.createValue<ThemeMode>('dark'),
  route: fk.createValue<SitePage>(page),
});

describe('playground pages', () => {
  it('reflows one home hierarchy and uses scaled display text', () => {
    const state = createState('home');
    const home = createHomePage(state.layout, state.theme, state.route, () => undefined);
    const visual = home.findFirstChild('HomeCodeVisual', true) as fk.Frame;
    state.layout.set('mobile');
    expect(home.findFirstChild('HomeCodeVisual', true)).toBe(visual);
    expect(visual.Size).toEqual(fk.udim2FromOffset(358, 370));
    expect((home.findFirstChild('HomeProductName', true) as fk.TextLabel).TextScaled).toBe(true);
    home.destroy();
  });

  it('presents a focused guide with local navigation', () => {
    const state = createState('guide');
    const guide = createGuidePage(
      state.layout,
      state.theme,
      state.route,
      () => undefined,
      () => undefined,
    );
    const sidebar = guide.findFirstChild('GuidePageSidebar', true) as fk.Frame;
    expect(sidebar.element.style.position).toBe('sticky');
    expect(guide.element.textContent).toContain('Create your first interface');
    expect(guide.element.textContent).toContain('TextScaled: true');
    expect(guide.element.textContent).toContain('Bind reactive values');
    expect(guide.element.textContent).toContain('Respond to the viewport');
    expect(guide.element.textContent).toContain('Clean up one owner');
    guide.destroy();
  });

  it('documents core APIs and optional namespaces', () => {
    const state = createState('api');
    const api = createApiPage(state.layout, state.theme, state.route, () => undefined);
    expect(api.element.textContent).toContain('Factories');
    expect(api.element.textContent).toContain('Instance methods');
    expect(api.findFirstChild('ScrollingFrameReferenceCard', true)).toBeDefined();
    expect(api.findFirstChild('UIListLayoutReferenceCard', true)).toBeDefined();
    expect(api.element.textContent).toContain('fka.spring');
    expect(api.element.textContent).toContain('fkh.bindResponsiveLayout');

    state.layout.set('mobile');
    const cornerCard = api.findFirstChild('UICornerReferenceCard', true) as fk.Frame;
    const cornerTitle = cornerCard.findFirstChild('Text') as fk.TextLabel;
    expect(cornerTitle.Size).toEqual(fk.udim2FromOffset(140, 40));
    api.destroy();
  });
});
