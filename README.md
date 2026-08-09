# FrameKit

FrameKit is a React-independent TypeScript UI toolkit that brings Roblox-inspired UI concepts to the browser DOM without a class hierarchy.

```ts
import { append, Color3, createFrame, createScreenGui, mount, UDim2, update } from 'framekit';

const gui = createScreenGui();
mount(gui, '#app');

const frame = createFrame({
  Size: UDim2.fromOffset(300, 180),
  BackgroundColor3: Color3.fromRGB(37, 99, 235),
});
append(gui, frame);

update(frame, { Visible: false });
```

## Tree and lifecycle

Nodes are opaque handles managed through small, composable functions:

```ts
import { append, children, destroy, find, isDestroyed } from 'framekit';

append(parent, child);
children(parent);
find(parent, 'Inventory', true);
destroy(parent); // recursively destroys its descendants
isDestroyed(child); // true
```

## Events

Buttons expose typed events through `on`. Subscribing returns an idempotent unsubscribe function, and destroying the button removes its DOM listeners and subscriptions.

```ts
import { createTextButton, on } from 'framekit';

const button = createTextButton({ Text: 'Equip' });
const unsubscribe = on(button, 'MouseButton1Click', (event) => {
  console.log(event);
});

unsubscribe();
```

## Inspiration

The inspiration for FrameKit is pretty simple. I come from a Roblox Luau and Roblox-TS background, so Roblox's UI system feels like home to me.

Concepts like `Frame`, `UDim2`, anchor points, and scale/offset positioning make immediate sense in my head. In a way, they are almost ingrained. On the other hand, CSS and variants such as Tailwind have always felt less intuitive to me, especially their syntax and layout rules.

For the longest time, I relied on AI to do all the work for me. That, however, removed all the fun in designing and writing code. Instead of fully escaping my comfort zone, I decided to bring part of that comfort zone with me.
