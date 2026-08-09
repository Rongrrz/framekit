# FrameKit

FrameKit is a React-independent TypeScript UI toolkit that brings Roblox-inspired UI concepts to the browser DOM without a class hierarchy.

```ts
import {
  append,
  color3,
  createFrame,
  createScreenGui,
  mount,
  udim2FromOffset,
  update,
} from 'framekit';

const gui = createScreenGui();
mount(gui, '#app');

const frame = createFrame({
  Size: udim2FromOffset(300, 180),
  BackgroundColor3: color3(37, 99, 235),
});
append(gui, frame);

update(frame, { Visible: false });
```

## API overview

FrameKit keeps construction separate from behavior. Use `create...` factories to make nodes, then compose them with standalone functions.

| Area       | API                                                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Factories  | `createScreenGui`, `createFrame`, `createScrollingFrame`, `createTextLabel`, `createTextButton`, `createImageLabel`, `createImageButton` |
| Decorators | `createUICorner`, `createUIStroke`, `createUIListLayout`                                                                                 |
| Properties | `props`, `update`                                                                                                                        |
| Tree       | `append`, `detach`, `parent`, `children`, `find`                                                                                         |
| Lifecycle  | `mount`, `unmount`, `isMounted`, `destroy`, `isDestroyed`                                                                                |
| Events     | `on`, `createSignal`                                                                                                                     |
| Scrolling  | `canvasPosition`, `scrollTo`                                                                                                             |
| Values     | `color3`, `color3FromHex`, `udim`, `udim2`, `udim2FromOffset`, `udim2FromScale`, `vector2`                                               |

Factory arguments are partial property objects. Read operations return snapshots, so changing a returned property object, child list, or canvas position does not mutate FrameKit state; use the corresponding function instead.

## Decorators

`UICorner` and `UIStroke` are element-less nodes. Append them to a GUI node to decorate its DOM element, update them like any other node, and detach or destroy them to remove their styles.

```ts
import { append, color3, createUICorner, createUIStroke } from 'framekit';

append(frame, createUICorner({ CornerRadius: 12 }));
append(
  frame,
  createUIStroke({
    Color: color3(59, 130, 246),
    Thickness: 2,
    BorderStrokePosition: 'Outer',
  }),
);
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

## List layouts

`UIListLayout` is an element-less layout decorator that arranges its parent's direct GUI children in a row or column. While attached, it controls child positioning and ordering; detaching or destroying it restores each child's own `Position` and `AnchorPoint` rendering.

```ts
import { append, createUIListLayout, udim } from 'framekit';

append(
  scrollingFrame,
  createUIListLayout({
    FillDirection: 'Vertical',
    Padding: udim(0, 8),
    HorizontalAlignment: 'Center',
    SortOrder: 'LayoutOrder',
  }),
);
```

Set `LayoutOrder` on GUI nodes to control their order. `SortOrder: 'Name'` sorts by `Name` instead, and `Wraps` enables additional rows or columns when children exceed the available space.

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

## Project structure

Public construction functions live together in `src/factory.ts`. Their internal builders use names such as `frameNode`, `textNode`, and `imageNode`; these builders own element setup while the public factories own the `create...` API.

Primitive values are frozen structural objects rather than class instances. PascalCase names such as `Color3`, `UDim2`, and `Vector2` are TypeScript types; lowercase functions such as `color3`, `udim2FromOffset`, and `vector2` create their values.

Core responsibilities are intentionally split:

- `core/node.ts` stores opaque node state, property updates, rendering, and destruction.
- `core/tree.ts` owns parent-child relationships and DOM synchronization.
- `core/signals.ts` provides standalone typed signals; `core/events.ts` binds signals to node lifecycles.
- GUI modules render their own properties. Decorator nodes describe appearance or child layout, and their parent recomputes the result whenever the relevant tree or properties change.

## Development

Run the complete local validation suite before committing:

```sh
npm run check
```

## Inspiration

The inspiration for FrameKit is pretty simple. I come from a Roblox Luau and Roblox-TS background, so Roblox's UI system feels like home to me.

Concepts like `Frame`, `UDim2`, anchor points, and scale/offset positioning make immediate sense in my head. In a way, they are almost ingrained. On the other hand, CSS and variants such as Tailwind have always felt less intuitive to me, especially their syntax and layout rules.

For the longest time, I relied on AI to do all the work for me. That, however, removed all the fun in designing and writing code. Instead of fully escaping my comfort zone, I decided to bring part of that comfort zone with me.
