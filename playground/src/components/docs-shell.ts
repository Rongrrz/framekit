import {
  createFrame,
  createLink,
  createUIListLayout,
  type Frame,
  udim,
  udim2,
  udim2FromOffset,
  type ObservableValue,
} from 'framekit';

import { createRoutedPage, documentationPages, pageHash, type SitePage } from '../router';
import { bindThemeColors, fonts, type ThemeValue } from '../theme';
import { createButton, createText } from '../ui';

export {
  appendFlowText,
  createExampleRow,
  appendOutline,
  appendArticleTitle,
  appendArticleSection,
  appendCallout,
  appendPageNavigation,
} from './docs-article';
export type { NavigationItem } from './docs-article';

export type DocsShell = Readonly<{
  page: Frame;
  sidebar: Frame;
  article: Frame;
  outline: Frame;
}>;

export const createDocsShell = (
  name: string,
  pageName: Exclude<SitePage, 'home'>,
  theme: ThemeValue,
  route: ObservableValue<SitePage>,
): DocsShell => {
  const page = createRoutedPage(name, pageName, route);

  const content = createFrame({
    Name: `${name}Content`,
    Size: udim2(1, 0, 0, 0),
    AutomaticSize: 'Y',
    BackgroundTransparency: 1,
  });

  content.unsafeElement.classList.add('pg-docs');

  const sidebar = createFrame({
    Name: `${name}Sidebar`,
    BackgroundTransparency: 1,
    TagName: 'nav',
  });

  sidebar.unsafeElement.classList.add('pg-docs-sidebar');
  sidebar.unsafeElement.setAttribute('aria-label', 'Documentation topics');

  const menu = createButton(theme, {
    label: 'Browse documentation  ↓',
    name: `${name}Browse`,
    size: udim2(1, 0, 0, 44),
    position: udim2FromOffset(0, 0),
    textSize: 14,
  });

  menu.unsafeElement.classList.add('pg-docs-menu');

  const sidebarId = `pg-topics-${pageName}`;
  sidebar.unsafeElement.id = sidebarId;
  menu.unsafeElement.setAttribute('aria-controls', sidebarId);
  menu.unsafeElement.setAttribute('aria-expanded', 'false');
  menu.onClick(() => {
    const expanded = menu.unsafeElement.getAttribute('aria-expanded') !== 'true';
    menu.unsafeElement.setAttribute('aria-expanded', String(expanded));
    content.unsafeElement.classList.toggle('pg-menu-open', expanded);
  });

  let group = '';

  for (const entry of documentationPages) {
    if (entry.group !== group) {
      group = entry.group;

      const heading = createText(theme, {
        text: group.toUpperCase(),
        size: udim2(1, 0, 0, 32),
        color: 'textFaint',
        textSize: 11,
        weight: 700,
      });

      heading.unsafeElement.classList.add('pg-nav-group');
      heading.Parent = sidebar;
    }

    const link = createLink({
      Text: entry.label,
      Href: pageHash(entry.page),
      TextUnderline: false,
      FontFamily: fonts.sans,
      TextSize: 14,
      TextXAlignment: 'Left',
      BackgroundTransparency: 1,
    });

    link.unsafeElement.classList.add('pg-topic-link');
    bindThemeColors(link, theme, (palette) => ({
      TextColor3: entry.page === pageName ? palette.accent : palette.textMuted,
    }));

    if (entry.page === pageName) {
      link.unsafeElement.setAttribute('aria-current', 'page');
    }

    link.Parent = sidebar;
  }

  const article = createFrame({
    Name: `${name}Article`,
    BackgroundTransparency: 1,
    AutomaticSize: 'Y',
    Size: udim2(1, 0, 0, 0),
    TagName: 'article',
  });

  article.unsafeElement.classList.add('pg-article');
  createUIListLayout({ Padding: udim(0, 14) }).Parent = article;

  const outline = createFrame({
    Name: `${name}Outline`,
    BackgroundTransparency: 1,
    TagName: 'nav',
  });

  outline.unsafeElement.classList.add('pg-outline');
  outline.unsafeElement.setAttribute('aria-label', 'On this page');
  menu.Parent = content;
  sidebar.Parent = content;
  article.Parent = content;
  outline.Parent = content;
  content.Parent = page;

  return Object.freeze({ page, sidebar, article, outline });
};
