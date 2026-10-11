import { installPlaygroundStyles } from '../theme';
import { createWorkbench } from './app';

installPlaygroundStyles();
const app = createWorkbench();
app.mount('#root');
if (import.meta.hot) {
  import.meta.hot.dispose(() => app.destroy());
}
