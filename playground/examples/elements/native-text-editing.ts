import { createTextInput } from 'framekit';

const email = createTextInput({
  InputType: 'Email',
  AccessibleLabel: 'Email address',
  PlaceholderText: 'you@example.com',
});

email.onTextChanged((text) => {
  console.log(text);
});
