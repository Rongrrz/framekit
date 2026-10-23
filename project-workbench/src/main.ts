import { createWorkbench } from './app';

import './style.css';

const workbench = createWorkbench();
workbench.mount('#root');

if (import.meta.hot) {
  import.meta.hot.dispose(() => workbench.destroy());
}

if (import.meta.env.DEV) {
  const { bindRuntimeInspector } = await import('framekit/devtools');
  bindRuntimeInspector(workbench, { button: false, shortcut: { key: 'F8' } });
}
