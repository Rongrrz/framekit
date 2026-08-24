import { fk } from 'framekit';

import { decorate } from '../shared/decorate';

export type StatPillOptions = Readonly<{
  text: string;
  size: fk.UDim2;
  accent: fk.Color3;
  textSize?: number;
}>;

export function createStatPill(options: StatPillOptions): fk.TextLabelNode {
  const pill = fk.createTextLabel({
    Size: options.size,
    BackgroundColor3: options.accent,
    BackgroundTransparency: 0.82,
    Text: options.text,
    TextColor3: options.accent,
    TextSize: options.textSize ?? 12,
    FontWeight: 750,
  });
  decorate(pill, 17, options.accent);
  return pill;
}
