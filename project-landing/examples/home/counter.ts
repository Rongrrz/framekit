import { createScreenGui, createTextButton, udim2FromOffset } from 'framekit';

const app = createScreenGui();

const button = createTextButton({
  Text: 'Clicks: 0',
  Size: udim2FromOffset(220, 44),
});

let count = 0;

button.onClick(() => {
  button.Text = `Clicks: ${++count}`;
});

button.Parent = app;

app.mount('#app');
