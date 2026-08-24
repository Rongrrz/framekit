# FrameKit

FrameKit is a TypeScript/JavaScript UI Library heavily inspired by Roblox and video game UI systems. The core idea here is to adapt the 'video game UI experience' and allow those coming from a game-making background to make games on the web and/or to transition into the frontend smoothly, without being haunted by the scary, scary, CSS.

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

`ScreenGui` always covers the browser viewport and does not require a global CSS reset. Its mount target determines where it lives in the DOM, not its dimensions.

## API overview

FrameKit keeps construction separate from behavior. Use `create...` factories to make nodes, then compose them with standalone functions.

| Area       | API                                                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Factories  | `createScreenGui`, `createFrame`, `createScrollingFrame`, `createTextLabel`, `createTextButton`, `createImageLabel`, `createImageButton` |
| Decorators | `createUICorner`, `createUIStroke`, `createUIAspectRatioConstraint`, `createUIListLayout`                                                |
| Properties | `props`, `update`                                                                                                                        |
| Tree       | `append`, `detach`, `parent`, `children`, `find`                                                                                         |
| Lifecycle  | `mount`, `unmount`, `isMounted`, `destroy`, `isDestroyed`                                                                                |
| Events     | `on`, `createSignal`                                                                                                                     |
| Scrolling  | `canvasPosition`, `scrollTo`                                                                                                             |
| Values     | `color3`, `color3FromHex`, `udim`, `udim2`, `udim2FromOffset`, `udim2FromScale`, `vector2`                                               |

Factory arguments are partial property objects. Read operations return snapshots, so changing a returned property object, child list, or canvas position does not mutate FrameKit state; use the corresponding function instead.

## Decorators

`UICorner` and `UIStroke` are element-less modifier nodes. Append them to a GUI node to decorate its DOM element, update them like any other node, and detach or destroy them to remove their styles. A parent can contain only one modifier of each kind; appending a duplicate throws without disturbing either tree.

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

## Aspect ratio constraints

`UIAspectRatioConstraint` maintains a GUI node's width-to-height ratio. Its default ratio is `1`, producing a square bounded by the node's requested size. `DominantAxis` chooses the dimension to preserve, while `AspectType: 'ScaleWithParentSize'` sizes the node against its parent instead.

```ts
import { append, createUIAspectRatioConstraint } from 'framekit';

append(
  imageButton,
  createUIAspectRatioConstraint({
    AspectRatio: 16 / 9,
    DominantAxis: 'Width',
  }),
);
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

## Project structure

Public construction functions live together in `src/factory.ts`. Their internal builders use names such as `frameNode`, `textNode`, and `imageNode`; these builders own element setup while the public factories own the `create...` API.

Primitive values are frozen structural objects rather than class instances. PascalCase names such as `Color3`, `UDim2`, and `Vector2` are TypeScript types; lowercase functions such as `color3`, `udim2FromOffset`, and `vector2` create their values.

Core responsibilities are intentionally split:

- `core/node/base.ts`, `state.ts`, `lifecycle.ts`, and `tree.ts` own shared node infrastructure.
- `core/node/variants` contains the GUI, decorator, and layout implementations so role-specific behavior stays separate from ordinary tree and lifecycle code.
- `core/event/signal.ts` provides standalone typed signals, while `core/event/node-event.ts` binds event signals to node lifecycles.
- `rendering/button-input.ts` translates native mouse input into FrameKit button events.
- GUI modules render their own properties. Modifier nodes remain ordinary tree children, while their parent maintains a keyed index for fast lookup and uniqueness. Modifiers describe appearance or child layout, and their parent recomputes the result whenever the relevant tree or properties change.

## Development

Run the complete local validation suite before committing:

```sh
npm run check
```

Tests mirror source domains under `src/__tests__/core`, `gui`, `decorators`, `primitives`, and `utils`. Shared test-only constructors and DOM cleanup live under `src/__tests__/helpers`; they are not part of FrameKit's public factories or package exports.

## Inspiration

The inspiration for FrameKit is pretty simple. I come from a Roblox Luau and Roblox-TS background, so Roblox's UI system feels like home to me.

Concepts like `Frame`, `UDim2`, anchor points, and scale/offset positioning make immediate sense in my head. In a way, they are almost ingrained. On the other hand, CSS and variants such as Tailwind have always felt less intuitive to me, especially their syntax and layout rules.

For the longest time, I relied on AI to do all the work for me. That, however, removed all the fun in designing and writing code. Instead of fully escaping my comfort zone, I decided to bring part of that comfort zone with me.
