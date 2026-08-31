import { fk } from 'framekit';

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
  size: fk.UDim2;
  position?: fk.UDim2;
  color?: ThemeToken;
  textSize?: number;
  scaled?: boolean;
  weight?: string | number;
  xAlignment?: fk.TextXAlignment;
  yAlignment?: fk.TextYAlignment;
  wrapped?: boolean;
  font?: string;
  name?: string;
}>;

type ButtonOptions = Readonly<{
  label: string;
  size: fk.UDim2;
  position: fk.UDim2;
  background?: ThemeToken;
  foreground?: ThemeToken;
  name?: string;
  textSize?: number;
  scaled?: boolean;
  font?: string;
}>;

type SurfaceOptions = Readonly<{
  name: string;
  size?: fk.UDim2;
  position?: fk.UDim2;
  background?: ThemeToken;
  border?: ThemeToken;
  radius?: number;
  clipsDescendants?: boolean;
}>;

export const createText = (theme: ThemeValue, options: TextOptions): fk.TextLabel => {
  const color = options.color ?? 'text';
  const label = fk.createTextLabel({
    Name: options.name ?? 'Text',
    Size: options.size,
    Position: options.position ?? fk.udim2FromOffset(0, 0),
    BackgroundTransparency: 1,
    Text: options.text,
    TextColor3: themeColor(theme, color),
    TextSize: options.textSize ?? typeScale.body,
    TextScaled: options.scaled ?? false,
    TextWrapped: options.wrapped ?? false,
    TextXAlignment: options.xAlignment ?? 'Left',
    TextYAlignment: options.yAlignment ?? 'Center',
    FontFamily: options.font ?? fonts.sans,
    FontWeight: options.weight ?? 500,
  });
  bindThemeColors(label, theme, (palette) => ({ TextColor3: palette[color] }));
  return label;
};

export const addRoundedBorder = (
  theme: ThemeValue,
  instance: fk.GuiElement,
  radius: number,
  strokeColor: ThemeToken = 'border',
  thickness = 1,
): void => {
  instance.addChild(fk.createUICorner({ CornerRadius: radius }));
  const stroke = fk.createUIStroke({ Color: themeColor(theme, strokeColor), Thickness: thickness });
  bindThemeColors(stroke, theme, (palette) => ({ Color: palette[strokeColor] }));
  instance.addChild(stroke);
};

export const createSurface = (theme: ThemeValue, options: SurfaceOptions): fk.Frame => {
  const background = options.background ?? 'surface';
  const frame = fk.createFrame({
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

export const createButton = (theme: ThemeValue, options: ButtonOptions): fk.TextButton => {
  const background = options.background ?? 'surfaceRaised';
  const foreground = options.foreground ?? 'text';
  const button = fk.createTextButton({
    Name: options.name ?? `${options.label.replaceAll(/\s+/g, '')}Button`,
    Size: options.size,
    Position: options.position,
    BackgroundColor3: themeColor(theme, background),
    Text: options.label,
    TextColor3: themeColor(theme, foreground),
    TextSize: options.textSize ?? typeScale.small,
    TextScaled: options.scaled ?? false,
    FontFamily: options.font ?? fonts.sans,
    FontWeight: 750,
  });
  bindThemeColors(button, theme, (palette) => ({
    BackgroundColor3: palette[background],
    TextColor3: palette[foreground],
  }));
  addRoundedBorder(theme, button, 11, background);
  button.element.classList.add('pg-button');
  return button;
};

export const createPill = (
  theme: ThemeValue,
  label: string,
  size: fk.UDim2,
  position: fk.UDim2,
  color: ThemeToken = 'accent',
): fk.TextLabel => {
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

export const appendCodeLines = (
  parent: fk.GuiElement,
  theme: ThemeValue,
  lines: readonly Readonly<{ text: string; color?: ThemeToken }>[],
  startY: number,
  lineHeight = 28,
): readonly fk.TextLabel[] =>
  lines.map((line, index) => {
    const label = createText(theme, {
      text: line.text,
      size: fk.udim2(1, -40, 0, lineHeight),
      position: fk.udim2FromOffset(20, startY + index * lineHeight),
      color: line.color ?? 'textMuted',
      textSize: typeScale.code,
      font: fonts.mono,
      name: `CodeLine${index + 1}`,
    });
    label.element.classList.add('pg-code');
    parent.addChild(label);
    return label;
  });
