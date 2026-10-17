import { createScrollingFrame, vector2 } from 'framekit';

const viewport = createScrollingFrame({
  ScrollingDirection: 'Y',
  AutomaticCanvasSize: 'Y',
});

viewport.scrollTo(vector2(0, 200));

viewport.scrollBy(vector2(0, 40));
