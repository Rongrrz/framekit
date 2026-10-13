import {
  createFrame,
  createLink,
  createScrollingFrame,
  createUIListLayout,
  type Frame,
  type GuiElement,
  type TextLabel,
  udim,
  udim2,
  udim2FromOffset,
  udim2FromScale,
  type ObservableValue,
} from 'framekit';

import { copyCommand } from '../behaviors/copy-button';
import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import {
  createRoutedPage,
  documentationPages,
  pageHash,
  type DocsPage,
  type SitePage,
} from '../router';
import {
  bindThemeColors,
  fonts,
  themeColor,
  typeScale,
  type ThemeToken,
  type ThemeValue,
} from '../theme';
import { appendCodeLines, createButton, createSurface, createText } from '../ui';

export type DocsShell = Readonly<{
  page: Frame;
  sidebar: Frame;
  article: Frame;
  outline: Frame;
}>;

export type NavigationItem = Readonly<{
  label: string;
  target: GuiElement;
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
  const sidebar = createFrame(
    { Name: `${name}Sidebar`, BackgroundTransparency: 1 },
    { tagName: 'nav' },
  );
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
  const article = createFrame(
    {
      Name: `${name}Article`,
      BackgroundTransparency: 1,
      AutomaticSize: 'Y',
      Size: udim2(1, 0, 0, 0),
    },
    { tagName: 'article' },
  );
  article.unsafeElement.classList.add('pg-article');
  createUIListLayout({ Padding: udim(0, 12) }).Parent = article;
  const outline = createFrame(
    { Name: `${name}Outline`, BackgroundTransparency: 1 },
    { tagName: 'nav' },
  );
  outline.unsafeElement.classList.add('pg-outline');
  outline.unsafeElement.setAttribute('aria-label', 'On this page');
  menu.Parent = content;
  sidebar.Parent = content;
  article.Parent = content;
  outline.Parent = content;
  content.Parent = page;
  return Object.freeze({ page, sidebar, article, outline });
};

/** Lets wrapped documentation text contribute its actual height to the article flow. */
export const appendFlowText = (
  parent: Frame,
  theme: ThemeValue,
  options: Parameters<typeof createText>[1],
  lineHeight = 1.5,
): TextLabel => {
  const label = createText(theme, { ...options, wrapped: true, yAlignment: 'Top' });
  label.AutomaticSize = 'Y';
  const text = label.unsafeElement.querySelector<HTMLElement>('[data-framekit-text]')!;
  Object.assign(text.style, { position: 'static', inset: 'auto', display: 'block', lineHeight });
  label.Parent = parent;
  return label;
};

/** Keeps interactive examples in one row on desktop and a vertical stack on mobile. */
export const createExampleRow = (
  parent: Frame,
  layout: ObservableValue<PlaygroundLayout>,
): Frame => {
  const row = createFrame({
    Name: 'ExampleRow',
    Size: udim2FromScale(1, 0),
    AutomaticSize: 'Y',
    BackgroundTransparency: 1,
  });
  const list = createUIListLayout({ Padding: udim(0, 16) });
  bindLayoutProperties(row, layout, list, {
    desktop: { FillDirection: 'Horizontal' },
    mobile: { FillDirection: 'Vertical' },
  });
  list.Parent = row;
  row.unsafeElement.classList.add('pg-examples');
  row.Parent = parent;
  return row;
};

export const appendOutline = (
  parent: Frame,
  theme: ThemeValue,
  items: readonly NavigationItem[],
  onNavigate: (target: GuiElement) => void,
): void => {
  createText(theme, {
    text: 'On this page',
    size: udim2(1, -28, 0, 28),
    position: udim2FromOffset(20, 0),
    textSize: typeScale.caption,
    weight: 650,
  }).Parent = parent;
  for (const [index, item] of items.entries()) {
    const link = createButton(theme, {
      label: item.label,
      name: `${item.label.replaceAll(/\s+/g, '')}OutlineButton`,
      size: udim2(1, -28, 0, 30),
      position: udim2FromOffset(20, 38 + index * 34),
      background: 'canvas',
      foreground: 'textMuted',
      textSize: typeScale.caption,
    });
    link.FontWeight = 550;
    link.TextXAlignment = 'Left';
    link.onClick(() => onNavigate(item.target));
    link.Parent = parent;
  }
};

export const appendArticleTitle = (
  parent: Frame,
  theme: ThemeValue,
  eyebrow: string,
  title: string,
  body: string,
): TextLabel => {
  appendFlowText(parent, theme, {
    text: eyebrow,
    size: udim2FromScale(1, 0),
    color: 'accent',
    textSize: typeScale.caption,
    font: fonts.mono,
    weight: 650,
  });
  const heading = appendFlowText(
    parent,
    theme,
    {
      text: title,
      size: udim2FromScale(1, 0),
      textSize: typeScale.page,
      weight: 700,
    },
    1.2,
  );
  appendFlowText(parent, theme, {
    text: body,
    size: udim2FromScale(1, 0),
    color: 'textMuted',
    textSize: typeScale.body,
  });
  heading.unsafeElement.setAttribute('role', 'heading');
  heading.unsafeElement.setAttribute('aria-level', '1');
  return heading;
};

export const appendArticleSection = (
  parent: Frame,
  theme: ThemeValue,
  title: string,
  body: string,
): TextLabel => {
  const heading = appendFlowText(
    parent,
    theme,
    {
      text: title,
      size: udim2FromScale(1, 0),
      textSize: typeScale.section,
      weight: 650,
    },
    1.25,
  );
  heading.unsafeElement.style.marginTop = '28px';
  heading.unsafeElement.setAttribute('role', 'heading');
  heading.unsafeElement.setAttribute('aria-level', '2');
  appendFlowText(parent, theme, {
    text: body,
    size: udim2FromScale(1, 0),
    color: 'textMuted',
    textSize: typeScale.body,
  });
  return heading;
};

export const appendCodeBlock = (
  parent: Frame,
  theme: ThemeValue,
  name: string,
  lines: readonly Readonly<{ text: string; color?: ThemeToken }>[],
  filename = 'example.ts',
): void => {
  const block = createSurface(theme, {
    name,
    size: udim2(1, 0, 0, 72 + lines.length * 22),
    background: 'surface',
    radius: 12,
  });
  const title = createText(theme, {
    text: filename,
    size: udim2(1, -100, 0, 36),
    position: udim2FromOffset(16, 2),
    font: fonts.mono,
    textSize: 11,
    color: 'textFaint',
  });
  title.Parent = block;
  const copy = createButton(theme, {
    label: 'Copy',
    name: `${name}Copy`,
    size: udim2FromOffset(62, 28),
    position: udim2(1, -74, 0, 6),
    textSize: 11,
  });
  copy.AccessibleLabel = `Copy ${name} example`;
  copy.onClick(() => void copyCommand(copy, lines.map((line) => line.text).join('\n'), 'Copy'));
  copy.Parent = block;
  const scroll = createScrollingFrame({
    Name: `${name}Scroll`,
    Size: udim2(1, 0, 1, -40),
    Position: udim2FromOffset(0, 40),
    BackgroundTransparency: 1,
    ScrollingDirection: 'X',
    ScrollBarThickness: 8,
    ScrollBarImageColor3: themeColor(theme, 'textFaint'),
  });
  scroll.unsafeElement.setAttribute('aria-label', `${name} code example`);
  bindThemeColors(scroll, theme, (palette) => ({ ScrollBarImageColor3: palette.textFaint }));
  const labels = appendCodeLines(scroll, theme, lines, 16, 22);
  scroll.CanvasSize = udim2FromOffset(
    Math.max(0, ...labels.map((label) => label.Size.X.Offset)) + 40,
    0,
  );
  scroll.Parent = block;
  block.unsafeElement.style.marginTop = '4px';
  block.Parent = parent;
};

export const appendCallout = (parent: Frame, theme: ThemeValue, text: string): void => {
  const callout = createSurface(theme, {
    name: 'Callout',
    size: udim2FromScale(1, 0),
    background: 'accentMuted',
    border: 'accentMuted',
    radius: 10,
  });
  callout.AutomaticSize = 'Y';
  callout.unsafeElement.style.padding = '14px 16px';
  callout.unsafeElement.style.marginTop = '12px';
  createUIListLayout().Parent = callout;
  appendFlowText(callout, theme, {
    text,
    size: udim2FromScale(1, 0),
    color: 'text',
    textSize: typeScale.small,
  });
  callout.Parent = parent;
};

/** Connects the reading path with native links that can also open in a new tab. */
export const appendPageNavigation = (parent: Frame, theme: ThemeValue, page: DocsPage): void => {
  const index = documentationPages.findIndex((entry) => entry.page === page);
  const footer = createFrame(
    { Name: 'ArticleNavigation', BackgroundTransparency: 1 },
    { tagName: 'nav' },
  );
  footer.unsafeElement.classList.add('pg-article-navigation');
  footer.unsafeElement.setAttribute('aria-label', 'Continue reading');
  for (const [label, entry] of [
    ['Previous', documentationPages[index - 1]],
    ['Next', documentationPages[index + 1]],
  ] as const) {
    if (!entry) {
      continue;
    }
    const link = createLink({
      Text: `${label} / ${entry.label} →`,
      Href: pageHash(entry.page),
      FontFamily: fonts.sans,
      TextSize: 14,
      TextXAlignment: 'Left',
      BackgroundTransparency: 1,
    });
    link.unsafeElement.classList.add('pg-reading-link');
    bindThemeColors(link, theme, (palette) => ({ TextColor3: palette.accent }));
    link.Parent = footer;
  }
  footer.Parent = parent;
};
