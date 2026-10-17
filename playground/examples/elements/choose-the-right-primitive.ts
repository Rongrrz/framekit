import { createFrame, createTextLabel } from 'framekit';

const card = createFrame({ Name: 'Profile', TagName: 'section' });

const title = createTextLabel({
  Text: 'Your profile',
  TextSize: 24,
  TextTagName: 'h2',
});

title.Parent = card;
