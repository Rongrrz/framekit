import type { Frame, GuiElement, ObservableValue } from 'framekit';

import type { SitePage } from '../router';
import type { ThemeValue } from '../theme';
import { createCodeBlock } from './code-block';
import {
  appendArticleSection,
  appendArticleTitle,
  appendCallout,
  appendOutline,
  appendPageNavigation,
  createDocsShell,
} from './docs-shell';
import { referenceChapters } from './reference-content';

/** Renders a chapter without coupling its content to the responsive documentation shell. */
export const createReferencePage = (
  page: keyof typeof referenceChapters,
  theme: ThemeValue,
  route: ObservableValue<SitePage>,
  scrollTo: (target: GuiElement) => void,
): Frame => {
  const chapter = referenceChapters[page];
  const shell = createDocsShell(`${page}Page`, page, theme, route);
  appendArticleTitle(
    shell.article,
    theme,
    'FRAMEKIT / DOCUMENTATION',
    chapter.title,
    chapter.summary,
  );

  const outline = chapter.sections.map((section, index) => {
    const target = appendArticleSection(shell.article, theme, section.title, section.body);

    if ('code' in section) {
      createCodeBlock(theme, `${page}${index + 1}Code`, section.code, `${page}.ts`).Parent =
        shell.article;
    }

    if ('note' in section) {
      appendCallout(shell.article, theme, section.note);
    }

    return { label: section.title, target };
  });

  appendOutline(shell.outline, theme, outline, scrollTo);
  appendPageNavigation(shell.article, theme, page);

  return shell.page;
};
