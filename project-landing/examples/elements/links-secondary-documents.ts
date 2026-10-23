import { createLink } from 'framekit';

const source = createLink(
  {
    Text: 'Source',
    Href: 'https://github.com',
    Target: '_blank',
    Rel: 'noopener noreferrer',
  },
  { ownerDocument: document },
);
