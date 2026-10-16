import { createObservableValue, type TextButton, type TextLabel } from 'framekit';
import { describe, expect, it, vi } from 'vitest';

import { createGuidePage } from '../src/components/guide-page';
import { createHomePage } from '../src/components/home';
import { createReferencePage } from '../src/components/reference-page';
import type { PlaygroundLayout } from '../src/layout';
import { documentationPages, type SitePage } from '../src/router';
import { themes } from '../src/theme';

const stateFor = (page: SitePage) => ({
  layout: createObservableValue<PlaygroundLayout>('desktop'),
  theme: createObservableValue(themes.dark),
  route: createObservableValue<SitePage>(page),
});

describe('playground reading experience', () => {
  it('offers a working landing example and routes into the guide', () => {
    const state = stateFor('home');
    const navigate = vi.fn();
    const page = createHomePage(state.theme, state.route, navigate);
    const counter = page.findFirstChild('LiveCounter', true) as TextButton;
    counter.unsafeElement.click();
    expect(counter.Text).toBe('Clicks: 1');
    (page.findFirstChild('GetStartedButton', true) as TextButton).unsafeElement.click();
    expect(navigate).toHaveBeenCalledWith('guide');
    expect(page.unsafeElement.querySelectorAll('a')).toHaveLength(4);
    page.destroy();
  });

  it('provides a concise guide, all topic links, and an accessible mobile menu', () => {
    const state = stateFor('guide');
    const page = createGuidePage(state.theme, state.route, vi.fn());
    const topics = page.unsafeElement.querySelector('[aria-label="Documentation topics"]')!;
    expect(topics.querySelectorAll('a')).toHaveLength(documentationPages.length);
    expect(topics.querySelector('[aria-current="page"]')?.textContent).toBe('Getting started');

    const browse = page.findFirstChild('GuidePageBrowse', true) as TextButton;
    expect(browse.unsafeElement.getAttribute('aria-expanded')).toBe('false');
    browse.unsafeElement.click();
    expect(browse.unsafeElement.getAttribute('aria-expanded')).toBe('true');
    expect(
      documentationPages.every(({ page: route }) => topics.querySelector(`a[href="#/${route}"]`)),
    ).toBe(true);

    expect(
      page.unsafeElement.querySelector('[aria-label="Continue reading"] a')?.getAttribute('href'),
    ).toBe('#/elements');
    page.destroy();
  });

  it('keeps outline navigation tied to the actual section instance', () => {
    const state = stateFor('animation');
    const scrollTo = vi.fn();
    const page = createReferencePage('animation', state.theme, state.route, scrollTo);
    const outline = page.findFirstChild('RetargetaspringOutlineButton', true) as TextButton;

    const heading = page
      .getDescendants()
      .find((node) => node.isA('TextLabel') && node.Text === 'Retarget a spring') as TextLabel;

    state.layout.set('mobile');
    outline.unsafeElement.click();
    expect(scrollTo).toHaveBeenCalledWith(heading);
    expect(heading.unsafeElement.getAttribute('aria-level')).toBe('2');
    page.destroy();
  });
});
