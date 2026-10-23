import { createFrame, udim2FromOffset } from 'framekit';

const card = createFrame();

const stop = card.onPropertyChanged('Visible', (next, previous) => {
  console.log(previous, next);
});

card.setProperties({
  Visible: true,
  Position: udim2FromOffset(24, 24),
});

stop();
