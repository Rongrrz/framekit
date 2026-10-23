import { createFrame, createTextButton, createUIListLayout, udim, udim2 } from 'framekit';

const column = createFrame({
  Size: udim2(1, 0, 0, 0),
  AutomaticSize: 'Y',
});

createUIListLayout({ Padding: udim(0, 12) }).Parent = column;

for (const Text of ['Account', 'Billing', 'Security']) {
  createTextButton({ Text, Size: udim2(1, 0, 0, 44) }).Parent = column;
}
