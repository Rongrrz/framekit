## Inspiration

The inspiration for FrameKit is pretty simple.
I come from a Roblox Luau and Roblox-TS background,
so Roblox’s UI system feels like home to me.

🫚 Concepts like `Frame`, `UDim2`, anchor points,
and scale/offset positioning make immediate sense in my head.
In a way, they are almost ingrained...
On the other hand, CSS and all of its variants like Tailwind, has always felt less intuitive to me,
especially its syntax and layout rules.

🤖 For the longest time, I relied on AI to do all the work for me.
That however, removed all the fun in designing and writing code.
So, instead of fully escaping my comfort zone,
I decided to bring part of that comfort zone with me.

😄 Framekit is a React-independent TypeScript UI framework that maps a
Roblox-inspired object model directly onto browser DOM and CSS.

```ts
import { Color3, Frame, ScreenGui, UDim2 } from 'framekit';

const gui = new ScreenGui();
gui.Mount('#app');

const frame = new Frame();
frame.Size = UDim2.fromOffset(300, 180);
frame.BackgroundColor3 = Color3.fromRGB(37, 99, 235);
frame.Parent = gui;
```

The current migration slice provides `Instance`, `ScreenGui`, `Frame`, and the
`UDim`, `UDim2`, `Vector2`, and `Color3` value types. Text,
image, interaction, and scrolling objects will follow on this direct-DOM core.
