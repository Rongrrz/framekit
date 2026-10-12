import { installPlaygroundStyles } from '../theme';
import { createWorkbench } from './app';

installPlaygroundStyles();
const app = createWorkbench();
app.mount('#root');
if (import.meta.hot) {
  import.meta.hot.dispose(() => app.destroy());
}

if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('inspect')) {
  const { createRuntimeInspector } = await import('framekit/devtools');
  const inspector = createRuntimeInspector(app);
  inspector.gui.mount('#root');
}
