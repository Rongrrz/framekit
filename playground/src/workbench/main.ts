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
  const debug = bindRuntimeInspectorRoute(app, { returnTo: '/workbench.html' });
  const launch = app.findFirstChild('OpenRuntimeInspector', true);
  if (launch?.isA('TextButton')) {
    launch.onClick(debug.open);
  }
}
