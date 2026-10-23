import { createTextButton, createObservableValue, watchOwnedValue } from 'framekit';

const count = createObservableValue(0);

const button = createTextButton();

watchOwnedValue(button, count, (value) => {
  button.Text = `Count: ${value}`;
});

button.onClick(() => count.set(count.get() + 1));
