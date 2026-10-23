import { createFrame, bindResponsiveLayout, udim2 } from 'framekit';

const container = createFrame();

const panel = createFrame();

panel.Parent = container;

bindResponsiveLayout(container, {
  observe: container,
  breakpoints: [
    {
      maxWidth: 599,

      apply: () => {
        panel.Size = udim2(1, 0, 0, 200);
      },
    },
    {
      apply: () => {
        panel.Size = udim2(0.5, -12, 0, 200);
      },
    },
  ],
});
