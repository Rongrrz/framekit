import {
  createObservableValue,
  type Frame,
  type TextButton,
  type TextLabel,
  udim2,
  udim2FromOffset,
} from 'framekit';
import { describe, expect, it, vi } from 'vitest';

import { createApiPage } from '../src/components/api-page';
import { createGuidePage } from '../src/components/guide-page';
import { createHomePage } from '../src/components/home';
import type { PlaygroundLayout } from '../src/layout';
import type { SitePage } from '../src/router';
import { themes } from '../src/theme';

const createState = (page: SitePage) => ({
  layout: createObservableValue<PlaygroundLayout>('desktop'),
  theme: createObservableValue(themes.dark),
  route: createObservableValue<SitePage>(page),
});

describe('playground pages', () => {
  it('separates landing-page code from its preview and restores desktop action widths', () => {
    const state = createState('home');
    const home = createHomePage(state.layout, state.theme, state.route, () => undefined);
    const names = ['GetStartedButton', 'ApiReferenceButton', 'HomeInstallButton'];
    const buttons = names.map((name) => home.findFirstChild(name, true) as TextButton);
    const visual = home.findFirstChild('HomeCodeVisual', true) as Frame;
    const lastLine = visual.findFirstChild('CodeLine8') as TextLabel;
    const result = visual.findFirstChild('HomeResult') as Frame;
    for (const currentLayout of ['desktop', 'mobile', 'desktop'] as const) {
      state.layout.set(currentLayout);
      expect(lastLine.Position.Y.Offset + lastLine.Size.Y.Offset).toBeLessThan(
        result.Position.Y.Offset,
      );
      if (currentLayout === 'mobile') {
        expect(buttons.map((button) => button.Size.X.Offset)).toEqual([358, 358, 358]);
      } else {
        expect(buttons.map((button) => button.Size.X.Offset)).toEqual([174, 188, 208]);
        expect(buttons[0]!.Position.X.Offset + buttons[0]!.Size.X.Offset).toBeLessThan(
          buttons[1]!.Position.X.Offset,
        );
        expect(buttons[1]!.Position.X.Offset + buttons[1]!.Size.X.Offset).toBeLessThan(
          buttons[2]!.Position.X.Offset,
        );
      }
    }
    home.destroy();
  });

  it('presents a focused guide with local navigation', () => {
    const state = createState('guide');
    const scrollTo = vi.fn();
    const navigate = vi.fn();
    const guide = createGuidePage(state.layout, state.theme, state.route, scrollTo, navigate);
    const sidebar = guide.findFirstChild('GuidePageSidebar', true) as Frame;
    expect(sidebar.unsafeElement.style.position).toBe('sticky');
    const next = guide.findFirstChild('GuideNextButton', true);
    if (!next?.isA('TextButton')) {
      throw new Error('Missing guide next button.');
    }
    next.unsafeElement.click();
    expect(navigate).toHaveBeenCalledWith('api');
    const outline = guide.findFirstChild('CleanupOutlineButton', true);
    if (!outline?.isA('TextButton')) {
      throw new Error('Missing cleanup outline button.');
    }
    const heading = guide
      .getDescendants()
      .find((node) => node.isA('TextLabel') && node.Text === 'Clean up one owner');
    if (!heading?.isA('TextLabel')) {
      throw new Error('Missing cleanup heading.');
    }
    outline.unsafeElement.click();
    expect(scrollTo).toHaveBeenCalledWith(heading);
    state.layout.set('mobile');
    expect((guide.findFirstChild('GuidePageSidebarRail', true) as Frame).Visible).toBe(false);
    expect((guide.findFirstChild('GuidePageOutlineRail', true) as Frame).Visible).toBe(false);
    guide.destroy();
  });

  it('keeps API cards usable in the mobile layout', () => {
    const state = createState('api');
    const api = createApiPage(state.layout, state.theme, state.route, () => undefined);
    state.layout.set('mobile');
    const cornerCard = api.findFirstChild('UICornerReferenceCard', true) as Frame;
    const cornerTitle = cornerCard.findFirstChild('Text') as TextLabel;
    expect(cornerTitle.Size).toEqual(udim2(1, -28, 0, 20));
    api.destroy();
  });

  it('navigates to the actual API heading after its layout changes', () => {
    const state = createState('api');
    const scrollTo = vi.fn();
    const api = createApiPage(state.layout, state.theme, state.route, scrollTo);
    const animation = api
      .getDescendants()
      .find((node) => node.isA('TextLabel') && node.Text === 'Animation');
    expect(animation?.isA('TextLabel')).toBe(true);
    if (!animation?.isA('TextLabel')) {
      throw new Error('Missing Animation heading.');
    }
    animation.Position = udim2FromOffset(0, 4400);
    const outline = api.findFirstChild('AnimationOutlineButton', true);
    if (!outline?.isA('TextButton')) {
      throw new Error('Missing Animation outline link.');
    }
    outline.unsafeElement.click();
    expect(scrollTo).toHaveBeenCalledWith(animation);
    api.destroy();
  });
});
