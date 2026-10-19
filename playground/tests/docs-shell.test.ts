import { createFrame, createTextButton, createUIListLayout, createObservableValue } from 'framekit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  appendArticleSection,
  createDocsShell,
  createExampleRow,
} from '../src/components/docs-shell';
import type { PlaygroundLayout } from '../src/layout';
import { themes } from '../src/theme';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('documentation spacing', () => {
  it('uses natural paragraph height and fixed heading typography', () => {
    const parent = createFrame();

    const heading = appendArticleSection(
      parent,
      createObservableValue(themes.dark),
      'Heading',
      'Body',
    );

    const labels = parent.getChildren().filter((child) => child.isA('TextLabel'));
    expect(heading.TextScaled).toBe(false);
    expect(heading.TextSize).toBe(28);

    for (const label of labels) {
      expect(label.AutomaticSize).toBe('Y');
      expect(label.TextWrapped).toBe(true);
      expect(label.TextSelectable).toBe(true);
    }

    expect(labels.map((label) => label.LineHeight)).toEqual([1.25, 1.5]);

    parent.destroy();
  });

  it('keeps example rows in the article flow when the responsive direction changes', () => {
    const parent = createFrame();
    createUIListLayout().Parent = parent;

    const layout = createObservableValue<PlaygroundLayout>('desktop');
    const row = createExampleRow(parent, layout);
    createTextButton().Parent = row;
    expect(row.unsafeElement.style.position).toBe('relative');
    expect(row.unsafeElement.style.flexDirection).toBe('row');
    layout.set('mobile');
    expect(row.unsafeElement.style.position).toBe('relative');
    expect(row.unsafeElement.style.flexDirection).toBe('column');
    parent.destroy();
  });

  it('uses semantic document regions and content-driven height', () => {
    const shell = createDocsShell(
      'GuidePage',
      'guide',
      createObservableValue(themes.dark),
      createObservableValue('guide'),
    );

    expect(shell.article.unsafeElement.tagName).toBe('ARTICLE');
    expect(shell.page.AutomaticSize).toBe('Y');
    expect(shell.article.AutomaticSize).toBe('Y');
    expect(shell.sidebar.unsafeElement.getAttribute('aria-label')).toBe('Documentation topics');
    shell.page.destroy();
  });
});
