import { createFrame, udim2, vector2 } from 'framekit';

const card = createFrame({
  Size: udim2(1, -48, 0, 180), // Parent width minus 48px.
  Position: udim2(0.5, 0, 0, 24),
  AnchorPoint: vector2(0.5, 0), // Center the top edge.
});
