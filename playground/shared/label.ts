import { fk } from 'framekit';

import { palette } from './theme';

export type LabelOptions = Readonly<{
  text: string;
  size: fk.UDim2;
  position?: fk.UDim2;
  textSize?: number;
  color?: fk.Color3;
  xAlignment?: fk.TextXAlignment;
  yAlignment?: fk.TextYAlignment;
  weight?: string | number;
  wrapped?: boolean;
}>;

/** Creates a transparent text label with the playground's text defaults. */
export function createLabel(options: LabelOptions): fk.TextLabelNode {
  return fk.createTextLabel({
    Size: options.size,
    Position: options.position ?? fk.udim2FromScale(0, 0),
    BackgroundTransparency: 1,
    Text: options.text,
    TextColor3: options.color ?? palette.text,
    TextSize: options.textSize ?? 14,
    TextWrapped: options.wrapped ?? false,
    TextXAlignment: options.xAlignment ?? 'Left',
    TextYAlignment: options.yAlignment ?? 'Center',
    FontWeight: options.weight ?? 'normal',
  });
}
