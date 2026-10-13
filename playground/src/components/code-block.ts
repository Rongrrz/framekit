import { createScrollingFrame, type Frame, udim2, udim2FromOffset } from 'framekit';

import { copyCommand } from '../behaviors/copy-button';
import { bindThemeColors, fonts, themeColor, type ThemeValue } from '../theme';
import { createButton, createSurface, createText } from '../ui';

/** A Playground code example with native text selection and a shared display/copy source. */
export const createCodeBlock = (
  theme: ThemeValue,
  name: string,
  lines: readonly string[],
  filename = 'example.ts',
): Frame => {
  const source = lines.join('\n').replaceAll('\r\n', '\n').trimEnd();
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
  const document = scroll.unsafeElement.ownerDocument;
  const content = document.createElement('div');
  content.className = 'pg-code-source';
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = source;
  pre.append(code);
  content.append(pre);
  scroll.unsafeElement.append(content);
  scroll.Parent = block;

  // The examples remain readable and copyable while the optional enhancement loads.
  const prepared = import('./code-formatting')
    .then(({ prepareCode }) => prepareCode(source, filename))
    .catch(() => ({ source, html: undefined }));
  void prepared.then((example) => {
    if (block.isDestroyed() || !example.html) {
      return;
    }
    content.innerHTML = example.html;
    block.Size = udim2(1, 0, 0, 72 + example.source.split('\n').length * 22);
  });
  copy.onClick(() => {
    void prepared.then((example) => {
      if (!copy.isDestroyed()) {
        return copyCommand(copy, example.source, 'Copy');
      }
    });
  });
  block.unsafeElement.style.marginTop = '4px';
  return block;
};
