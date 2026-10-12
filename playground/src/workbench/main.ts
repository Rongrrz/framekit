import { installPlaygroundStyles } from '../theme';
import { createWorkbench } from './app';

installPlaygroundStyles();
const app = createWorkbench();
app.mount('#root');
if (import.meta.hot) {
  import.meta.hot.dispose(() => app.destroy());
}

if (import.meta.env.DEV) {
  const { bindRuntimeInspectorRoute } = await import('framekit/devtools');
  bindRuntimeInspectorRoute(app, { returnTo: '/workbench.html' });
}
