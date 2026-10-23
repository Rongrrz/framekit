import { createScreenGui, createFrame } from 'framekit';

const app = createScreenGui();

const card = createFrame();

card.Parent = app;

card.Parent = undefined; // Keep it for later.

card.Parent = app;

app.unmount(); // Keep the whole tree.

app.destroy(); // Permanently release the whole tree.

console.log(app.isDestroyed()); // true
