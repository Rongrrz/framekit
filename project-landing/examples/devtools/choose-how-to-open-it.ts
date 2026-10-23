import { createScreenGui } from 'framekit';
import { bindRuntimeInspector } from 'framekit/devtools';

const app = createScreenGui();

app.mount('#app');

const debug = bindRuntimeInspector(app, {
  button: true,
  shortcut: { key: 'D', ctrlKey: true, shiftKey: true },
});
// debug.open(); debug.close(); debug.dispose();
