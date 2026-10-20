import {
  color3FromHex,
  createTextLabel,
  createUIPadding,
  createScrollingFrame,
  watchOwnedValue,
  type Frame,
  udim,
  udim2,
  udim2FromOffset,
} from 'framekit';

import { copyCommand } from '../behaviors/copy-button';
import type { CodeExample } from '../code-example';
import { bindThemeColors, fonts, themeColor, themes, type ThemeValue } from '../theme';
import { createButton, createSurface, createText } from '../ui';

/** A Playground code example with native text selection and a shared display/copy source. */
export const createCodeBlock = (
  theme: ThemeValue,
  name: string,
  example: CodeExample,
  filename = 'example.ts',
): Frame => {
  const { source } = example;

  const block = createSurface(theme, {
    name,
    size: udim2(1, 0, 0, 72 + source.split('\n').length * 22),
    background: 'surface',
    radius: 12,
    clipsDescendants: true,
  });

  block.unsafeElement.classList.add('pg-code-block');

  const title = createText(theme, {
    text: filename,
    size: udim2(1, -130, 0, 36),
    position: udim2FromOffset(20, 2),
    font: fonts.mono,
    textSize: 12,
    color: 'textFaint',
  });

  title.Parent = block;

  const copy = createButton(theme, {
    label: 'Copy',
    name: `${name}Copy`,
    size: udim2FromOffset(100, 28),
    position: udim2(1, -112, 0, 6),
    textSize: 11,
  });

  copy.AccessibleLabel = `Copy ${name} example`;
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

  const content = createTextLabel({
    Name: `${name}Source`,
    TextTagName: 'pre',
    RichText: true,
    TextSelectable: true,
    TextXAlignment: 'Left',
    TextYAlignment: 'Top',
    TextSize: 13,
    LineHeight: 22 / 13,
    FontFamily: fonts.mono,
    FontWeight: 400,
    AutomaticSize: 'XY',
    BackgroundTransparency: 1,
  });
  createUIPadding({
    PaddingTop: udim(0, 16),
    PaddingBottom: udim(0, 16),
    PaddingLeft: udim(0, 20),
    PaddingRight: udim(0, 20),
  }).Parent = content;
  watchOwnedValue(content, theme, (palette) => {
    const code = palette === themes.dark ? example.dark : example.light;
    content.setProperties({ Text: code.text, TextColor3: color3FromHex(code.foreground) });
    scroll.BackgroundTransparency = 0;
    scroll.BackgroundColor3 = color3FromHex(code.background);
  });
  content.Parent = scroll;
  scroll.Parent = block;

  copy.onClick(() => {
    void copyCommand(copy, source, 'Copy');
  });

  return block;
};
