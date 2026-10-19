import {
  type Color3,
  createFrame,
  createTextButton,
  createTextLabel,
  createUICorner,
  createUIStroke,
  createUIPadding,
  udim,
  type Frame,
  type GuiElement,
  type TextButton,
  type TextLabel,
  type TextXAlignment,
  type TextYAlignment,
  type UDim2,
  udim2FromOffset,
} from 'framekit';

import {
  bindThemeColors,
  fonts,
  themeColor,
  typeScale,
  type ThemeToken,
  type ThemeValue,
} from './theme';

type TextOptions = Readonly<{
  text: string;
  size: UDim2;
  position?: UDim2;
  color?: ThemeToken | Color3;
  textSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  scaled?: boolean;
  weight?: string | number;
  xAlignment?: TextXAlignment;
  yAlignment?: TextYAlignment;
  wrapped?: boolean;
  font?: string;
  name?: string;
}>;

type ButtonOptions = Readonly<{
  label: string;
  size: UDim2;
  position: UDim2;
  background?: ThemeToken;
  foreground?: ThemeToken;
  name?: string;
  textSize?: number;
  scaled?: boolean;
  font?: string;
  radius?: number;
}>;

type SurfaceOptions = Readonly<{
  name: string;
  size?: UDim2;
  position?: UDim2;
  background?: ThemeToken;
  border?: ThemeToken;
  radius?: number;
  clipsDescendants?: boolean;
}>;

export const createText = (theme: ThemeValue, options: TextOptions): TextLabel => {
  const color = options.color ?? 'text';
  const usesThemeColor = typeof color === 'string';

  const label = createTextLabel({
    Name: options.name ?? 'Text',
    Size: options.size,
    Position: options.position ?? udim2FromOffset(0, 0),
    BackgroundTransparency: 1,
    Text: options.text,
    TextColor3: usesThemeColor ? themeColor(theme, color) : color,
    TextSize: options.textSize ?? typeScale.body,
    LineHeight: options.lineHeight ?? 1.2,
    LetterSpacing: options.letterSpacing ?? 0,
    TextScaled: options.scaled ?? false,
    TextWrapped: options.wrapped ?? false,
    TextXAlignment: options.xAlignment ?? 'Left',
    TextYAlignment: options.yAlignment ?? 'Center',
    FontFamily: options.font ?? fonts.sans,
    FontWeight: options.weight ?? 450,
  });

  if (usesThemeColor) {
    bindThemeColors(label, theme, (palette) => ({ TextColor3: palette[color] }));
  }

  return label;
};

export const addRoundedBorder = (
  theme: ThemeValue,
  instance: GuiElement,
  radius: number,
  strokeColor: ThemeToken = 'border',
  thickness = 1,
): void => {
  createUICorner({ CornerRadius: radius }).Parent = instance;

  const stroke = createUIStroke({ Color: themeColor(theme, strokeColor), Thickness: thickness });
  bindThemeColors(stroke, theme, (palette) => ({ Color: palette[strokeColor] }));
  stroke.Parent = instance;
};

/** Applies symmetric inner spacing through the same modifier used by application code. */
export const addPadding = (instance: GuiElement, vertical: number, horizontal = vertical): void => {
  createUIPadding({
    PaddingTop: udim(0, vertical),
    PaddingBottom: udim(0, vertical),
    PaddingLeft: udim(0, horizontal),
    PaddingRight: udim(0, horizontal),
  }).Parent = instance;
};

export const createSurface = (theme: ThemeValue, options: SurfaceOptions): Frame => {
  const background = options.background ?? 'surface';

  const frame = createFrame({
    Name: options.name,
    ...(options.size ? { Size: options.size } : {}),
    ...(options.position ? { Position: options.position } : {}),
    BackgroundColor3: themeColor(theme, background),
    ClipsDescendants: options.clipsDescendants ?? false,
  });

  bindThemeColors(frame, theme, (palette) => ({ BackgroundColor3: palette[background] }));
  addRoundedBorder(theme, frame, options.radius ?? 20, options.border ?? 'border');

  return frame;
};

export const createButton = (theme: ThemeValue, options: ButtonOptions): TextButton => {
  const background = options.background ?? 'surfaceRaised';
  const foreground = options.foreground ?? 'text';

  const button = createTextButton({
    Name: options.name ?? `${options.label.replaceAll(/\s+/g, '')}Button`,
    Size: options.size,
    Position: options.position,
    BackgroundColor3: themeColor(theme, background),
    Text: options.label,
    TextColor3: themeColor(theme, foreground),
    TextSize: options.textSize ?? typeScale.small,
    TextScaled: options.scaled ?? false,
    FontFamily: options.font ?? fonts.sans,
    FontWeight: 650,
  });

  bindThemeColors(button, theme, (palette) => ({
    BackgroundColor3: palette[background],
    TextColor3: palette[foreground],
  }));
  addRoundedBorder(theme, button, options.radius ?? 11, background);

  return button;
};

export const createPill = (
  theme: ThemeValue,
  label: string,
  size: UDim2,
  position: UDim2,
  color: ThemeToken = 'accent',
): TextLabel => {
  const pill = createText(theme, {
    text: label,
    size,
    position,
    color,
    textSize: typeScale.caption,
    font: fonts.mono,
    weight: 750,
    xAlignment: 'Center',
  });

  pill.Name = `${label.replaceAll(/\s+/g, '')}Pill`;
  pill.BackgroundTransparency = 0.88;
  bindThemeColors(pill, theme, (palette) => ({ BackgroundColor3: palette[color] }));
  addRoundedBorder(theme, pill, 999, color);

  return pill;
};
