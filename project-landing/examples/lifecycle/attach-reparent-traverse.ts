import { createFrame, createTextButton } from 'framekit';

const card = createFrame({ Name: 'Card' });

const action = createTextButton({ Name: 'Save' });

action.Parent = card;

const found = card.findFirstChild('Save', true);

if (found?.isA('TextButton')) {
  found.Text = 'Save changes'; // Concrete type narrowed.
}
