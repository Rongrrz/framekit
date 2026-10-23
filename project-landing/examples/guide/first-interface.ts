import {
  createScreenGui,
  createTextButton,
  createObservableValue,
  watchOwnedValue,
  udim2FromOffset,
} from 'framekit';

const app = createScreenGui();

const count = createObservableValue(0);

const button = createTextButton({
  Name: 'Counter',
  Text: 'Clicks: 0',
  Size: udim2FromOffset(220, 44),
  Position: udim2FromOffset(24, 24),
});

watchOwnedValue(button, count, (value) => {
  button.Text = `Clicks: ${value}`;
});

button.onClick(() => count.set(count.get() + 1));

button.Parent = app;

app.mount('#app');
