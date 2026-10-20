import {
  bindResponsiveLayout,
  bindSticky,
  createFrame,
  createLink,
  createScrollingFrame,
  createUICorner,
  createUIFlexItem,
  createUIListLayout,
  createUIPadding,
  createUISizeConstraint,
  type Frame,
  type ScrollingFrame,
  type Unsubscribe,
  udim,
  udim2,
  udim2FromOffset,
  vector2,
  watchOwnedValue,
  type ObservableValue,
} from 'framekit';

import { navigationHeight } from '../layout';
import { createRoutedPage, documentationPages, pageHash, type SitePage } from '../router';
import { bindThemeColors, fonts, type ThemeValue } from '../theme';
import { addPadding, constrainWidth, createButton, createText } from '../ui';

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
  sidebar: ScrollingFrame;
  article: Frame;
  outline: ScrollingFrame;
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
  const contentLimit = constrainWidth(content, 1380);
  const spacing = createUIPadding({
    PaddingTop: udim(0, 44),
    PaddingBottom: udim(0, 72),
    PaddingLeft: udim(0, 32),
    PaddingRight: udim(0, 32),
  });
  spacing.Parent = content;
  createUIListLayout({ Padding: udim(0, 28) }).Parent = content;

  const columns = createFrame({
    Name: `${name}Columns`,
    Size: udim2(1, 0, 0, 0),
    AutomaticSize: 'Y',
    BackgroundTransparency: 1,
  });
  const columnLayout = createUIListLayout({ FillDirection: 'Horizontal', Padding: udim(0, 40) });
  columnLayout.Parent = columns;

  const sidebar = createScrollingFrame({
    Name: `${name}Sidebar`,
    Size: udim2FromOffset(210, 0),
    AutomaticSize: 'Y',
    BackgroundTransparency: 1,
    TagName: 'nav',
    ScrollingDirection: 'Y',
    ScrollBarThickness: 8,
  });
  sidebar.unsafeElement.setAttribute('aria-label', 'Documentation topics');
  createUIListLayout().Parent = sidebar;
  createUIPadding({ PaddingBottom: udim(0, 8) }).Parent = sidebar;
  const sidebarLimit = createUISizeConstraint();
  sidebarLimit.Parent = sidebar;
  bindThemeColors(sidebar, theme, (palette) => ({ ScrollBarImageColor3: palette.textFaint }));

  const menu = createButton(theme, {
    label: 'Browse documentation  ↓',
    name: `${name}Browse`,
    size: udim2(1, 0, 0, 44),
    position: udim2FromOffset(0, 0),
    textSize: 14,
  });
  const sidebarId = `pg-topics-${pageName}`;
  sidebar.unsafeElement.id = sidebarId;
  menu.unsafeElement.setAttribute('aria-controls', sidebarId);
  menu.unsafeElement.setAttribute('aria-expanded', 'false');
  let expanded = false;

  const updateMenu = (): void => {
    const compact = columnLayout.FillDirection === 'Vertical';
    menu.Visible = compact;
    sidebar.Visible = !compact || expanded;
    menu.unsafeElement.setAttribute('aria-expanded', String(expanded));
  };

  menu.onClick(() => {
    expanded = !expanded;
    updateMenu();
  });
  let group = '';

  for (const entry of documentationPages) {
    if (entry.group !== group) {
      const gap = group ? 18 : 0;
      group = entry.group;
      const heading = createText(theme, {
        text: group.toUpperCase(),
        size: udim2(1, 0, 0, 28 + gap),
        color: 'textFaint',
        textSize: 11,
        weight: 700,
      });
      createUIPadding({ PaddingTop: udim(0, gap) }).Parent = heading;
      heading.Parent = sidebar;
    }

    const selected = entry.page === pageName;
    const link = createLink({
      Text: entry.label,
      Href: pageHash(entry.page),
      TextUnderline: false,
      FontFamily: fonts.sans,
      TextSize: 14,
      TextXAlignment: 'Left',
      BackgroundTransparency: 1,
      Size: udim2(1, 0, 0, 38),
    });
    addPadding(link, 0, 10);
    createUICorner({ CornerRadius: 6 }).Parent = link;
    let hovered = false;

    const update = (): void => {
      const palette = theme.get();
      link.setProperties({
        TextColor3: selected ? palette.accent : palette.textMuted,
        BackgroundColor3: palette.accent,
        BackgroundTransparency: selected ? 0.9 : hovered ? 0.94 : 1,
        FontWeight: selected ? 700 : 450,
      });
    };

    link.onMouseEnter(() => {
      hovered = true;
      update();
    });
    link.onMouseLeave(() => {
      hovered = false;
      update();
    });
    watchOwnedValue(link, theme, update);

    if (selected) {
      link.unsafeElement.setAttribute('aria-current', 'page');
    }

    link.Parent = sidebar;
  }

  const article = createFrame({
    Name: `${name}Article`,
    BackgroundTransparency: 1,
    AutomaticSize: 'Y',
    Size: udim2(0, 0, 0, 0),
    TagName: 'article',
  });
  createUIFlexItem().Parent = article;
  const articleLimit = constrainWidth(article, 720);
  createUIListLayout({ Padding: udim(0, 14) }).Parent = article;

  const outline = createScrollingFrame({
    Name: `${name}Outline`,
    BackgroundTransparency: 1,
    TagName: 'nav',
    AutomaticSize: 'Y',
    Size: udim2FromOffset(180, 0),
    ScrollingDirection: 'Y',
    ScrollBarThickness: 8,
  });
  outline.unsafeElement.setAttribute('aria-label', 'On this page');
  createUIPadding({ PaddingBottom: udim(0, 8) }).Parent = outline;
  const outlineLimit = createUISizeConstraint();
  outlineLimit.Parent = outline;
  bindThemeColors(outline, theme, (palette) => ({ ScrollBarImageColor3: palette.textFaint }));

  menu.Parent = content;
  sidebar.Parent = columns;
  article.Parent = columns;
  outline.Parent = columns;
  columns.Parent = content;
  content.Parent = page;
  let unstick: Unsubscribe | undefined;
  const viewport = page.unsafeElement.ownerDocument.defaultView;

  const updateHeight = (): void => {
    const maximum =
      columnLayout.FillDirection === 'Vertical'
        ? Number.MAX_SAFE_INTEGER
        : Math.max(0, (viewport?.innerHeight ?? 0) - navigationHeight - 48);
    const size = vector2(Number.MAX_SAFE_INTEGER, maximum);
    sidebarLimit.MaxSize = size;
    outlineLimit.MaxSize = size;
  };

  const arrange = (mode: 'compact' | 'reading' | 'wide', inset: number, top: number): void => {
    const compact = mode === 'compact';
    const wide = mode === 'wide';
    unstick?.();
    unstick = undefined;
    contentLimit.MaxSize = vector2(compact ? 780 : wide ? 1380 : 1080, Number.MAX_SAFE_INTEGER);
    spacing.setProperties({
      PaddingTop: udim(0, top),
      PaddingBottom: udim(0, compact ? 48 : 72),
      PaddingLeft: udim(0, inset),
      PaddingRight: udim(0, inset),
    });
    columnLayout.setProperties({
      FillDirection: compact ? 'Vertical' : 'Horizontal',
      Padding: udim(0, compact ? 28 : wide ? 40 : 36),
    });
    sidebar.Size = compact ? udim2(1, 0, 0, 0) : udim2FromOffset(wide ? 210 : 200, 0);
    sidebar.setProperties({ ScrollingEnabled: !compact, ScrollBarThickness: compact ? 0 : 8 });
    article.Size = udim2(compact ? 1 : 0, 0, 0, 0);
    articleLimit.MaxSize = vector2(
      compact ? Number.MAX_SAFE_INTEGER : 720,
      Number.MAX_SAFE_INTEGER,
    );
    outline.Visible = wide;
    updateMenu();
    updateHeight();

    if (!compact) {
      const left = bindSticky(sidebar, { inset: 24 });
      const right = bindSticky(outline, { inset: 24 });
      unstick = () => {
        left();
        right();
      };
    }
  };

  if (viewport) {
    viewport.addEventListener('resize', updateHeight);
    page.onDestroy(() => viewport.removeEventListener('resize', updateHeight));
  }

  bindResponsiveLayout(content, {
    observe: page,
    breakpoints: [
      { maxWidth: 480, apply: () => arrange('compact', 18, 20) },
      { maxWidth: 959, apply: () => arrange('compact', 24, 24) },
      { maxWidth: 1240, apply: () => arrange('reading', 32, 44) },
      { apply: () => arrange('wide', 32, 44) },
    ],
  });

  return Object.freeze({ page, sidebar, article, outline });
};
