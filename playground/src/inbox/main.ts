import { createObservableValue } from 'framekit';

import { bindDocumentTheme, installPlaygroundStyles } from '../theme';
import { createInbox } from './app';

installPlaygroundStyles();
const inbox = createInbox();
bindDocumentTheme(inbox, createObservableValue('dark'));
inbox.mount('#root');
if (import.meta.hot) {
  import.meta.hot.dispose(() => inbox.destroy());
}
