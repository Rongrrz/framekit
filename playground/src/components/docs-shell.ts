import { fk } from 'framekit';

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
  page: fk.Frame;
  sidebar: fk.Frame;
  article: fk.Frame;
  outline: fk.Frame;
}>;

export type NavigationItem = Readonly<{
  label: string;
  offset: number;
  active?: boolean;
}>;

export const createDocsShell = (
  name: string,
  pageName: Exclude<SitePage, 'home'>,
  layout: fk.Value<PlaygroundLayout>,
  theme: ThemeValue,
  route: fk.Value<SitePage>,
): DocsShell => {
  const page = createRoutedPage(name, pageName, layout, route);
  const content = fk.createFrame({
    Name: `${name}Content`,
    AnchorPoint: fk.vector2(0.5, 0),
    BackgroundTransparency: 1,
  });
  bindLayoutProperties(page, layout, content, {
    desktop: {
      Size: fk.udim2FromOffset(contentWidth.desktop, pageHeight.desktop[pageName]),
      Position: fk.udim2FromScale(0.5, 0),
    },
    mobile: {
      Size: fk.udim2FromOffset(contentWidth.mobile, pageHeight.mobile[pageName]),
      Position: fk.udim2FromScale(0.5, 0),
    },
  });

  const sidebarRail = fk.createFrame({
    Name: `${name}SidebarRail`,
    Size: fk.udim2FromOffset(244, pageHeight.desktop[pageName] - 80),
    BackgroundTransparency: 1,
  });
  createRailDivider(theme, 'Right').Parent = sidebarRail;
  const sidebar = fk.createFrame({
    Name: `${name}Sidebar`,
    Size: fk.udim2FromOffset(243, 600),
    Position: fk.udim2FromOffset(0, 42),
    BackgroundTransparency: 1,
  });
  const article = fk.createFrame({
    Name: `${name}Article`,
    Size: fk.udim2FromOffset(680, 1400),
    Position: fk.udim2FromOffset(292, 44),
    BackgroundTransparency: 1,
  });
  const outlineRail = fk.createFrame({
    Name: `${name}OutlineRail`,
    Size: fk.udim2FromOffset(196, pageHeight.desktop[pageName] - 80),
    Position: fk.udim2FromOffset(1020, 0),
    BackgroundTransparency: 1,
  });
  createRailDivider(theme, 'Left').Parent = outlineRail;
  const outline = fk.createFrame({
    Name: `${name}Outline`,
    Size: fk.udim2FromOffset(196, 520),
    Position: fk.udim2FromOffset(0, 52),
    BackgroundTransparency: 1,
  });

  bindLayoutProperties(page, layout, outlineRail, {
    desktop: {
      Size: fk.udim2FromOffset(196, pageHeight.desktop[pageName] - 80),
      Visible: true,
    },
    mobile: { Visible: false },
  });
  bindLayoutProperties(page, layout, article, {
    desktop: {
      Size: fk.udim2FromOffset(680, pageHeight.desktop[pageName] - 80),
      Position: fk.udim2FromOffset(292, 44),
    },
    mobile: {
      Size: fk.udim2FromOffset(358, pageHeight.mobile[pageName] - 80),
      Position: fk.udim2FromOffset(0, 42),
    },
  });
  bindLayoutProperties(page, layout, sidebarRail, {
    desktop: {
      Size: fk.udim2FromOffset(244, pageHeight.desktop[pageName] - 80),
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
  return Object.freeze({ page, sidebar, article, outline });
};

const createRailDivider = (theme: ThemeValue, edge: 'Left' | 'Right'): fk.Frame => {
  const divider = fk.createFrame({
    Name: `${edge}RailDivider`,
    Size: fk.udim2(0, 1, 1, 0),
    Position: edge === 'Right' ? fk.udim2(1, -1, 0, 0) : fk.udim2FromOffset(0, 0),
    BackgroundColor3: themeColor(theme, 'border'),
  });
  bindThemeColors(divider, theme, (palette) => ({ BackgroundColor3: palette.border }));
  return divider;
};

export const appendSidebarGroup = (
  parent: fk.Frame,
  theme: ThemeValue,
  title: string,
  items: readonly NavigationItem[],
  startY: number,
  onNavigate: (offset: number) => void,
): void => {
  createText(theme, {
    text: title,
    size: fk.udim2(1, -28, 0, 28),
    position: fk.udim2FromOffset(0, startY),
    textSize: typeScale.caption,
    weight: 800,
  }).Parent = parent;
  for (const [index, item] of items.entries()) {
    const link = createButton(theme, {
      label: item.label,
      name: `${item.label.replaceAll(/\s+/g, '')}SidebarButton`,
      size: fk.udim2(1, -28, 0, 32),
      position: fk.udim2FromOffset(0, startY + 34 + index * 36),
      background: 'canvas',
      foreground: item.active === true ? 'accent' : 'textMuted',
      textSize: typeScale.small,
    });
    link.TextXAlignment = 'Left';
    link.onClick(() => onNavigate(item.offset));
    link.Parent = parent;
  }
};

export const appendOutline = (
  parent: fk.Frame,
  theme: ThemeValue,
  items: readonly NavigationItem[],
  onNavigate: (offset: number) => void,
): void => {
  createText(theme, {
    text: 'On this page',
    size: fk.udim2(1, -28, 0, 28),
    position: fk.udim2FromOffset(20, 0),
    textSize: typeScale.caption,
    weight: 800,
  }).Parent = parent;
  for (const [index, item] of items.entries()) {
    const link = createButton(theme, {
      label: item.label,
      name: `${item.label.replaceAll(/\s+/g, '')}OutlineButton`,
      size: fk.udim2(1, -28, 0, 30),
      position: fk.udim2FromOffset(20, 38 + index * 34),
      background: 'canvas',
      foreground: 'textMuted',
      textSize: typeScale.caption,
    });
    link.TextXAlignment = 'Left';
    link.onClick(() => onNavigate(item.offset));
    link.Parent = parent;
  }
};

export const appendArticleTitle = (
  parent: fk.Frame,
  theme: ThemeValue,
  eyebrow: string,
  title: string,
  body: string,
): void => {
  createText(theme, {
    text: eyebrow,
    size: fk.udim2(1, 0, 0, 24),
    color: 'accent',
    textSize: typeScale.caption,
    font: fonts.mono,
    weight: 800,
  }).Parent = parent;
  createText(theme, {
    text: title,
    size: fk.udim2(1, 0, 0, 74),
    position: fk.udim2FromOffset(0, 34),
    textSize: typeScale.page,
    scaled: true,
    wrapped: true,
    weight: 900,
  }).Parent = parent;
  createText(theme, {
    text: body,
    size: fk.udim2(1, 0, 0, 104),
    position: fk.udim2FromOffset(0, 126),
    color: 'textMuted',
    textSize: typeScale.body,
    wrapped: true,
    yAlignment: 'Top',
  }).Parent = parent;
};

export const appendArticleSection = (
  parent: fk.Frame,
  theme: ThemeValue,
  title: string,
  body: string,
  y: number,
): void => {
  createText(theme, {
    text: title,
    size: fk.udim2(1, 0, 0, 48),
    position: fk.udim2FromOffset(0, y),
    textSize: typeScale.section,
    scaled: true,
    weight: 850,
  }).Parent = parent;
  createText(theme, {
    text: body,
    size: fk.udim2(1, 0, 0, 104),
    position: fk.udim2FromOffset(0, y + 62),
    color: 'textMuted',
    textSize: typeScale.body,
    wrapped: true,
    yAlignment: 'Top',
  }).Parent = parent;
};

export const appendCodeBlock = (
  parent: fk.Frame,
  theme: ThemeValue,
  name: string,
  lines: readonly Readonly<{ text: string; color?: ThemeToken }>[],
  y: number,
  height: number,
): void => {
  const block = createSurface(theme, {
    name,
    size: fk.udim2(1, 0, 0, height),
    position: fk.udim2FromOffset(0, y),
    background: 'surface',
    radius: 12,
  });
  appendCodeLines(block, theme, lines, 20, 27);
  block.Parent = parent;
};

export const appendCallout = (
  parent: fk.Frame,
  theme: ThemeValue,
  text: string,
  y: number,
): void => {
  const callout = createSurface(theme, {
    name: 'Callout',
    size: fk.udim2(1, 0, 0, 62),
    position: fk.udim2FromOffset(0, y),
    background: 'accentMuted',
    border: 'accentMuted',
    radius: 10,
  });
  createText(theme, {
    text,
    size: fk.udim2(1, -32, 1, -20),
    position: fk.udim2FromOffset(16, 10),
    color: 'text',
    textSize: typeScale.small,
    wrapped: true,
  }).Parent = callout;
  callout.Parent = parent;
};
