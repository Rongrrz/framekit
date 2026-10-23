import { createFrame } from 'framekit';
import { inspectInstance, toTreeString, createRuntimeInspector } from 'framekit/devtools';

const root = createFrame();

console.log(toTreeString(root));

console.log(inspectInstance(root).properties);

const inspector = createRuntimeInspector(root);

inspector.gui.mount(document.body);

inspector.select(root);

inspector.refresh();

inspector.gui.destroy();
