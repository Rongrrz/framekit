import { createFrame, createUICorner, createUIStroke, color3FromHex } from 'framekit';

const card = createFrame();

createUICorner({ CornerRadius: 12 }).Parent = card;

createUIStroke({
  Color: color3FromHex('#64748b'),
  Thickness: 1,
}).Parent = card;
