import {
  createFrame,
  createScrollingFrame,
  createUIListLayout,
  type Frame,
  type GuiElement,
  type TextLabel,
  udim,
  udim2,
  udim2FromOffset,
  udim2FromScale,
  type Value,
  vector2,
} from 'framekit';

import { bindLayoutProperties, contentWidth, pageHeight, type PlaygroundLayout } from '../layout';
import { createRoutedPage, type SitePage } from '../router';
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
  active?: boolean;
}>;

export const createDocsShell = (
  name: string,
  pageName: Exclude<SitePage, 'home'>,
  layout: Value<PlaygroundLayout>,
  theme: ThemeValue,
  route: Value<SitePage>,
): DocsShell => {
  const page = createRoutedPage(name, pageName, layout, route);
  const content = createFrame({
    Name: `${name}Content`,
    AnchorPoint: vector2(0.5, 0),
    BackgroundTransparency: 1,
  });
  bindLayoutProperties(page, layout, content, {
    desktop: {
      Size: udim2FromOffset(contentWidth.desktop, pageHeight.desktop[pageName]),
      Position: udim2FromScale(0.5, 0),
    },
    mobile: {
      Size: udim2FromOffset(contentWidth.mobile, pageHeight.mobile[pageName]),
      Position: udim2FromScale(0.5, 0),
    },
  });

  const sidebarRail = createFrame({
    Name: `${name}SidebarRail`,
    Size: udim2FromOffset(244, pageHeight.desktop[pageName] - 80),
    BackgroundTransparency: 1,
  });
  createRailDivider(theme, 'Right').Parent = sidebarRail;
  const sidebar = createFrame({
    Name: `${name}Sidebar`,
    Size: udim2FromOffset(243, 600),
    Position: udim2FromOffset(0, 42),
    BackgroundTransparency: 1,
  });
  const article = createFrame({
    Name: `${name}Article`,
    Size: udim2FromOffset(680, 0),
    Position: udim2FromOffset(292, 44),
    BackgroundTransparency: 1,
    AutomaticSize: 'Y',
  });
  createUIListLayout({ Padding: udim(0, 12) }).Parent = article;
  const outlineRail = createFrame({
    Name: `${name}OutlineRail`,
    Size: udim2FromOffset(196, pageHeight.desktop[pageName] - 80),
    Position: udim2FromOffset(1020, 0),
    BackgroundTransparency: 1,
  });
  createRailDivider(theme, 'Left').Parent = outlineRail;
  const outline = createFrame({
    Name: `${name}Outline`,
    Size: udim2FromOffset(196, 520),
    Position: udim2FromOffset(0, 52),
    BackgroundTransparency: 1,
  });

  bindLayoutProperties(page, layout, outlineRail, {
    desktop: {
      Size: udim2FromOffset(196, pageHeight.desktop[pageName] - 80),
      Visible: true,
    },
    mobile: { Visible: false },
  });
  bindLayoutProperties(page, layout, article, {
    desktop: {
      Size: udim2FromOffset(680, 0),
      Position: udim2FromOffset(292, 44),
    },
    mobile: {
      Size: udim2FromOffset(358, 0),
      Position: udim2FromOffset(0, 42),
    },
  });
  bindLayoutProperties(page, layout, sidebarRail, {
    desktop: {
      Size: udim2FromOffset(244, pageHeight.desktop[pageName] - 80),
      Visible: true,
    },
    mobile: { Visible: false },
  });

  sidebar.Parent = sidebarRail;
  outline.Parent = outlineRail;
  sidebarRail.Parent = content;
  article.Parent = content;
  outlineRail.Parent = content;
  sidebar.unsafeElement.style.position = 'sticky';
  outline.unsafeElement.style.position = 'sticky';
  content.Parent = page;
  const observer = new ResizeObserver(() => {
    const articleHeight = article.unsafeElement.offsetHeight;
    if (articleHeight === 0) return;
    const height = article.Position.Y.Offset + articleHeight + 64;
    content.Size = udim2FromOffset(content.Size.X.Offset, height);
    page.Size = udim2(1, 0, 0, height);
    sidebarRail.Size = udim2FromOffset(244, height - 80);
    outlineRail.Size = udim2FromOffset(196, height - 80);
  });
  observer.observe(article.unsafeElement);
  page.onDestroy(() => observer.disconnect());
  return Object.freeze({ page, sidebar, article, outline });
};

/** Lets wrapped documentation text contribute its actual height to the article flow. */
const appendFlowText = (
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
export const createExampleRow = (parent: Frame, layout: Value<PlaygroundLayout>): Frame => {
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
  row.Parent = parent;
  return row;
};

const createRailDivider = (theme: ThemeValue, edge: 'Left' | 'Right'): Frame => {
  const divider = createFrame({
    Name: `${edge}RailDivider`,
    Size: udim2(0, 1, 1, 0),
    Position: edge === 'Right' ? udim2(1, -1, 0, 0) : udim2FromOffset(0, 0),
    BackgroundColor3: themeColor(theme, 'border'),
  });
  bindThemeColors(divider, theme, (palette) => ({ BackgroundColor3: palette.border }));
  return divider;
};

export const appendSidebarGroup = (
  parent: Frame,
  theme: ThemeValue,
  title: string,
  items: readonly NavigationItem[],
  startY: number,
  onNavigate: (target: GuiElement) => void,
): void => {
  createText(theme, {
    text: title,
    size: udim2(1, -28, 0, 28),
    position: udim2FromOffset(0, startY),
    textSize: typeScale.caption,
    weight: 800,
  }).Parent = parent;
  for (const [index, item] of items.entries()) {
    const link = createButton(theme, {
      label: item.label,
      name: `${item.label.replaceAll(/\s+/g, '')}SidebarButton`,
      size: udim2(1, -28, 0, 32),
      position: udim2FromOffset(0, startY + 34 + index * 36),
      background: 'canvas',
      foreground: item.active === true ? 'accent' : 'textMuted',
      textSize: typeScale.small,
    });
    link.TextXAlignment = 'Left';
    link.onClick(() => onNavigate(item.target));
    link.Parent = parent;
  }
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
    weight: 800,
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
    weight: 800,
  });
  const heading = appendFlowText(
    parent,
    theme,
    {
      text: title,
      size: udim2FromScale(1, 0),
      textSize: typeScale.page,
      weight: 900,
    },
    1.2,
  );
  appendFlowText(parent, theme, {
    text: body,
    size: udim2FromScale(1, 0),
    color: 'textMuted',
    textSize: typeScale.body,
  });
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
      weight: 850,
    },
    1.25,
  );
  heading.unsafeElement.style.marginTop = '32px';
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
): void => {
  const block = createSurface(theme, {
    name,
    size: udim2(1, 0, 0, 32 + lines.length * 22),
    background: 'surface',
    radius: 12,
  });
  const scroll = createScrollingFrame({
    Name: `${name}Scroll`,
    Size: udim2FromScale(1, 1),
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
