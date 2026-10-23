import {
  color3FromHex,
  createFrame,
  createScrollingFrame,
  createTextButton,
  createTextInput,
  createTextLabel,
  createUICorner,
  createUIListLayout,
  createUIPadding,
  createUIStroke,
  udim,
  udim2,
  type Frame,
  type GuiElement,
  type TextButton,
  type TextInput,
  type TextLabel,
} from 'framekit';

/** Editor chrome is independent of the editable scene and its exported appearance. */
export const colors = {
  canvas: color3FromHex('#101419'),
  panel: color3FromHex('#191f27'),
  raised: color3FromHex('#222a35'),
  field: color3FromHex('#141a22'),
  border: color3FromHex('#303b48'),
  text: color3FromHex('#e8edf4'),
  muted: color3FromHex('#92a0b2'),
  faint: color3FromHex('#647387'),
  accent: color3FromHex('#a9efc5'),
  selected: color3FromHex('#2b443b'),
  danger: color3FromHex('#f3a49d'),
};

export const font =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
export const mono = 'ui-monospace, "SFMono-Regular", Consolas, monospace';

/** Give related controls one inherited visual rhythm without changing browser semantics. */
export const round = (node: GuiElement, radius = 6, border = false): void => {
  createUICorner({ CornerRadius: radius }).Parent = node;

  if (border) {
    createUIStroke({ Color: colors.border, Thickness: 1, BorderStrokePosition: 'Inner' }).Parent =
      node;
  }
};

export const panel = (name: string, parent: GuiElement, background = colors.panel): Frame => {
  const node = createFrame({ Name: name, Size: udim2(1, 0, 1, 0), BackgroundColor3: background });
  node.Parent = parent;
  return node;
};

export const label = (
  parent: GuiElement,
  text: string,
  height = 24,
  size = 12,
  color = colors.text,
): TextLabel => {
  const node = createTextLabel({
    Name: text || 'Label',
    Text: text,
    Size: udim2(1, 0, 0, height),
    BackgroundTransparency: 1,
    TextSize: size,
    FontFamily: font,
    TextColor3: color,
    TextXAlignment: 'Left',
    TextYAlignment: 'Center',
  });
  node.Parent = parent;
  return node;
};

export const button = (
  parent: GuiElement,
  text: string,
  action: () => void,
  width = 100,
): TextButton => {
  const node = createTextButton({
    Name: text,
    Text: text,
    AccessibleLabel: text,
    Size: udim2(0, width, 0, 32),
    BackgroundColor3: colors.raised,
    TextColor3: colors.text,
    TextSize: 12,
    FontFamily: font,
    FontWeight: 500,
  });
  round(node);
  node.Parent = parent;
  node.onClick(action);
  return node;
};

export const input = (parent: GuiElement, name: string, text = ''): TextInput => {
  const node = createTextInput({
    Name: name,
    AccessibleLabel: name,
    Text: text,
    Size: udim2(1, 0, 0, 32),
    BackgroundColor3: colors.field,
    TextColor3: colors.text,
    TextSize: 12,
    FontFamily: mono,
    TextXAlignment: 'Left',
  });
  round(node, 5, true);
  createUIPadding({ PaddingLeft: udim(0, 10), PaddingRight: udim(0, 10) }).Parent = node;
  node.Parent = parent;
  return node;
};

export const stack = (node: GuiElement, gap = 8, horizontal = false): void => {
  createUIListLayout({
    FillDirection: horizontal ? 'Horizontal' : 'Vertical',
    Padding: udim(0, gap),
    VerticalAlignment: horizontal ? 'Center' : 'Top',
  }).Parent = node;
};

export const scroll = (
  parent: GuiElement,
  name: string,
): ReturnType<typeof createScrollingFrame> => {
  const node = createScrollingFrame({
    Name: name,
    Size: udim2(1, 0, 1, 0),
    AutomaticCanvasSize: 'Y',
    ScrollingDirection: 'Y',
    BackgroundTransparency: 1,
    ScrollBarThickness: 6,
    ScrollBarImageColor3: colors.border,
  });
  node.Parent = parent;
  return node;
};

export const sectionTitle = (parent: GuiElement, text: string): TextLabel => {
  const node = label(parent, text, 34, 10, colors.muted);
  node.FontWeight = 650;
  node.LetterSpacing = 1.2;
  return node;
};
