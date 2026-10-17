import { createScreenGui, createTextButton } from 'framekit';
import { bindRuntimeInspector } from 'framekit/devtools';

const app = createScreenGui();

const debug = bindRuntimeInspector(app, {
  button: false,
  shortcut: { key: 'F8' },
});

const inspect = createTextButton({ Text: 'Inspect interface' });

inspect.onClick(debug.open);

inspect.Parent = app;
