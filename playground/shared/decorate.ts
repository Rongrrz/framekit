import { fk } from 'framekit';

import { palette } from './theme';

/** Adds the standard playground corner and border treatment to a node. */
export function decorate(
  node: fk.GuiNode,
  radius = 16,
  stroke = palette.border,
  thickness = 1,
): void {
  fk.append(node, fk.createUICorner({ CornerRadius: radius }));
  fk.append(node, fk.createUIStroke({ Color: stroke, Thickness: thickness }));
}
