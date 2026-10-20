import {
  createFrame,
  createLink,
  createUIListLayout,
  createUIFlexItem,
  createUIPadding,
  type Frame,
  type GuiElement,
  type TextLabel,
  udim,
  udim2,
  udim2FromOffset,
  udim2FromScale,
  type ObservableValue,
} from 'framekit';

import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { documentationPages, pageHash, type DocsPage } from '../router';
import { bindThemeColors, fonts, typeScale, type ThemeValue } from '../theme';
import { addPadding, createButton, createSurface, createText } from '../ui';

export type NavigationItem = Readonly<{ label: string; target: GuiElement }>;

/** Lets wrapped documentation text contribute its actual height to the article flow. */
export const appendFlowText = (
  parent: Frame,
  theme: ThemeValue,
  options: Parameters<typeof createText>[1],
  lineHeight = 1.5,
): TextLabel => {
  const label = createText(theme, { ...options, wrapped: true, yAlignment: 'Top' });
  label.setProperties({ AutomaticSize: 'Y', LineHeight: lineHeight, TextSelectable: true });
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

  const list = createUIListLayout({ Padding: udim(0, 16), Wraps: true });
  bindLayoutProperties(row, layout, list, {
    desktop: { FillDirection: 'Horizontal' },
    mobile: { FillDirection: 'Vertical' },
  });
  list.Parent = row;
  row.Parent = parent;

  return row;
};

export const appendOutline = (
  parent: Frame,
  theme: ThemeValue,
  items: readonly NavigationItem[],
  onNavigate: (target: GuiElement) => void,
): void => {
  parent.AutomaticSize = 'Y';
  createUIListLayout({ Padding: udim(0, 4) }).Parent = parent;

  const title = createText(theme, {
    text: 'On this page',
    size: udim2(1, 0, 0, 32),
    textSize: typeScale.caption,
    weight: 650,
  });
  createUIPadding({ PaddingLeft: udim(0, 20) }).Parent = title;
  title.Parent = parent;

  for (const item of items) {
    const link = createButton(theme, {
      label: item.label,
      name: `${item.label.replaceAll(/\s+/g, '')}OutlineButton`,
      size: udim2(1, 0, 0, 0),
      position: udim2FromOffset(0, 0),
      background: 'canvas',
      foreground: 'textMuted',
      textSize: typeScale.caption,
      radius: 0,
    });

    link.setProperties({
      FontWeight: 550,
      TextXAlignment: 'Left',
      TextWrapped: true,
      AutomaticSize: 'Y',
      LineHeight: 1.5,
    });
    addPadding(link, 8, 12);
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
  heading.LetterSpacing = -1.4;
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

  createUIPadding({ PaddingTop: udim(0, 28) }).Parent = heading;
  heading.LetterSpacing = -0.5;
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

export const appendCallout = (parent: Frame, theme: ThemeValue, text: string): void => {
  const callout = createSurface(theme, {
    name: 'Callout',
    size: udim2FromScale(1, 0),
    background: 'accentMuted',
    border: 'accentMuted',
    radius: 10,
  });

  callout.AutomaticSize = 'Y';
  addPadding(callout, 14, 16);
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

  const footer = createFrame({
    Name: 'ArticleNavigation',
    BackgroundTransparency: 1,
    Size: udim2FromScale(1, 0),
    AutomaticSize: 'Y',
    TagName: 'nav',
  });

  footer.unsafeElement.classList.add('pg-article-navigation');
  footer.unsafeElement.setAttribute('aria-label', 'Continue reading');
  createUIListLayout({ FillDirection: 'Horizontal', Wraps: true, Padding: udim(0, 12) }).Parent =
    footer;
  createUIPadding({ PaddingTop: udim(0, 24) }).Parent = footer;

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
      TextUnderline: false,
      FontFamily: fonts.sans,
      TextSize: 14,
      TextXAlignment: 'Left',
      BackgroundTransparency: 1,
      Size: udim2FromOffset(220, 44),
    });

    createUIFlexItem().Parent = link;
    link.unsafeElement.classList.add('pg-reading-link');
    bindThemeColors(link, theme, (palette) => ({ TextColor3: palette.accent }));
    link.Parent = footer;
  }

  footer.Parent = parent;
};
