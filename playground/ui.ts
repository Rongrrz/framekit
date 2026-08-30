import { fk } from 'framekit';

import { colors, fonts } from './theme';

type TextOptions = Readonly<{
  text: string;
  size: fk.UDim2;
  position?: fk.UDim2;
  color?: fk.Color3;
  textSize?: number;
  weight?: string | number;
  xAlignment?: fk.TextXAlignment;
  yAlignment?: fk.TextYAlignment;
  wrapped?: boolean;
  font?: string;
  name?: string;
}>;

export function createText(options: TextOptions): fk.TextLabel {
  return fk.createTextLabel({
    Name: options.name ?? 'Text',
    Size: options.size,
    Position: options.position ?? fk.udim2FromOffset(0, 0),
    BackgroundTransparency: 1,
    Text: options.text,
    TextColor3: options.color ?? colors.text,
    TextSize: options.textSize ?? 16,
    TextWrapped: options.wrapped ?? false,
    TextXAlignment: options.xAlignment ?? 'Left',
    TextYAlignment: options.yAlignment ?? 'Center',
    FontFamily: options.font ?? fonts.sans,
    FontWeight: options.weight ?? 500,
  });
}

export function addRoundedBorder(
  node: fk.GuiElement,
  radius: number,
  strokeColor: fk.Color3,
  thickness = 1,
): void {
  node.addChild(fk.createUICorner({ CornerRadius: radius }));

  node.addChild(fk.createUIStroke({ Color: strokeColor, Thickness: thickness }));
}

export function createPill(
  label: string,
  size: fk.UDim2,
  position: fk.UDim2,
  accent: fk.Color3,
): fk.TextLabel {
  const node = fk.createTextLabel({
    Name: `${label}Pill`,
    Size: size,
    Position: position,
    BackgroundColor3: accent,
    BackgroundTransparency: 0.82,
    Text: label,
    TextColor3: accent,
    TextSize: 12,
    FontFamily: fonts.mono,
    FontWeight: 700,
  });
  addRoundedBorder(node, 18, accent);
  return node;
}

export function createButton(
  label: string,
  size: fk.UDim2,
  position: fk.UDim2,
  background: fk.Color3,
  foreground: fk.Color3,
): fk.TextButton {
  const node = fk.createTextButton({
    Name: `${label}Button`,
    Size: size,
    Position: position,
    BackgroundColor3: background,
    Text: label,
    TextColor3: foreground,
    TextSize: 14,
    FontFamily: fonts.sans,
    FontWeight: 750,
  });
  addRoundedBorder(node, 12, background);
  return node;
}

export function appendCodeLine(
  parent: fk.GuiElement,
  line: string,
  y: number,
  color = colors.textMuted,
): fk.TextLabel {
  const node = createText({
    text: line,
    size: fk.udim2(1, -36, 0, 24),
    position: fk.udim2FromOffset(18, y),
    color,
    textSize: 13,
    font: fonts.mono,
  });

  parent.addChild(node);
  return node;
}

export function updateTextLines(nodes: readonly fk.TextLabel[], lines: readonly string[]): void {
  for (const [index, node] of nodes.entries()) {
    node.setProperties({ Text: lines[index] ?? '' });
  }
}
