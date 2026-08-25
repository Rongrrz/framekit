# FrameKit

FrameKit is a TypeScript/JavaScript UI Library heavily inspired by Roblox and video game UI systems. The core idea here is to adapt the 'video game UI experience' and allow those coming from a game-making background to make games on the web and/or to transition into the frontend smoothly, without being haunted by the scary, scary, CSS.

```ts
import { fk } from 'framekit';

const gui = fk.createScreenGui();
fk.mount(gui, '#app');

const frame = fk.createFrame({
  Size: fk.udim2FromOffset(300, 180),
  BackgroundColor3: fk.color3(37, 99, 235),
  Rotation: 8,
});
fk.append(gui, frame);

fk.update(frame, { Visible: false });
```

`ScreenGui` always covers the browser viewport and does not require a global CSS reset. Its mount target determines where it lives in the DOM, not its dimensions.

## API overview

FrameKit keeps construction separate from behavior. Use `create...` factories to make nodes, then compose them with standalone functions.

| Area       | API                                                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Factories  | `createScreenGui`, `createFrame`, `createScrollingFrame`, `createTextLabel`, `createTextButton`, `createImageLabel`, `createImageButton` |
| Modifiers  | `createUICorner`, `createUIStroke`, `createUIPadding`, `createUIScale`, `createUIAspectRatioConstraint`, `createUIListLayout`            |
| Properties | `props`, `update`                                                                                                                        |
| Tree       | `append`, `detach`, `parent`, `children`, `find`                                                                                         |
| Lifecycle  | `mount`, `unmount`, `isMounted`, `destroy`, `isDestroyed`                                                                                |
| Events     | `on`                                                                                                                                     |
| State      | `state.observable`, `state.observe`, `state.signal`                                                                                      |
| Animation  | `createMotion`, `tweenInfo`, `createTween`                                                                                               |
| Scrolling  | `canvasPosition`, `scrollTo`                                                                                                             |
| Values     | `color3`, `color3FromHex`, `udim`, `udim2`, `udim2FromOffset`, `udim2FromScale`, `vector2`                                               |

Factory arguments are partial property objects. Read operations return snapshots, so changing a returned property object, child list, or canvas position does not mutate FrameKit state; use the corresponding function instead.

## Modifiers

`UICorner`, `UIStroke`, `UIPadding`, and `UIScale` are element-less modifier nodes. Append them to a GUI node, update them like any other node, and detach or destroy them to remove their styles. A parent can contain only one modifier of each kind; appending a duplicate throws without disturbing either tree.

```ts
import { fk } from 'framekit';

fk.append(frame, fk.createUICorner({ CornerRadius: 12 }));
fk.append(
  frame,
  fk.createUIPadding({
    PaddingTop: fk.udim(0, 12),
    PaddingRight: fk.udim(0, 16),
    PaddingBottom: fk.udim(0, 12),
    PaddingLeft: fk.udim(0, 16),
  }),
);
fk.append(
  frame,
  fk.createUIStroke({
    Color: fk.color3(59, 130, 246),
    Thickness: 2,
    BorderStrokePosition: 'Outer',
  }),
);

const scale = fk.createUIScale();
fk.append(frame, scale);
fk.createMotion(scale).spring({ Scale: 1.05 });
```

## Tree and lifecycle

Nodes are opaque handles managed through small, composable functions:

```ts
import { fk } from 'framekit';

fk.append(parent, child);
fk.children(parent);
fk.find(parent, 'Inventory', true);
fk.destroy(parent); // recursively destroys its descendants
fk.isDestroyed(child); // true
```

## List layouts

`UIListLayout` is an element-less modifier that arranges its parent's direct GUI children in a row or column. While attached, it controls child positioning and ordering; detaching or destroying it restores each child's own `Position` and `AnchorPoint` rendering.

```ts
import { fk } from 'framekit';

fk.append(
  scrollingFrame,
  fk.createUIListLayout({
    FillDirection: 'Vertical',
    Padding: fk.udim(0, 8),
    HorizontalAlignment: 'Center',
    SortOrder: 'LayoutOrder',
  }),
);
```

Set `LayoutOrder` on GUI nodes to control their order. `SortOrder: 'Name'` sorts by `Name` instead, and `Wraps` enables additional rows or columns when children exceed the available space.

## Aspect ratio constraints

`UIAspectRatioConstraint` maintains a GUI node's width-to-height ratio. Its default ratio is `1`, producing a square bounded by the node's requested size. `DominantAxis` chooses the dimension to preserve, while `AspectType: 'ScaleWithParentSize'` sizes the node against its parent instead.

```ts
import { fk } from 'framekit';

fk.append(
  imageButton,
  fk.createUIAspectRatioConstraint({
    AspectRatio: 16 / 9,
    DominantAxis: 'Width',
  }),
);
```

## Events

Buttons expose typed events through `on`. Subscribing returns an idempotent unsubscribe function, and destroying the button removes its DOM listeners and subscriptions.

```ts
import { fk } from 'framekit';

const button = fk.createTextButton({ Text: 'Equip' });
const unsubscribe = fk.on(button, 'MouseButton1Click', (event) => {
  console.log(event);
});

unsubscribe();
```

## Observable values

Callable observable values hold small pieces of shared state without imposing a component or rendering model. Calling without an argument reads the value; calling with an argument writes it. Subscribers receive the current value immediately and then receive each distinct update synchronously.

```ts
import { fk } from 'framekit';

const quantity = fk.state.observable(0);
quantity.subscribe((value) => console.log(value)); // 0
quantity(1); // writes 1
quantity((current) => current + 1); // reads 1, then writes 2
```

Use `observe` for UI subscriptions. It registers the subscription with a node and releases it when that node is destroyed:

```ts
fk.state.observe(frame, quantity, (value) => {
  fk.update(label, { Text: String(value) });
});

fk.destroy(frame); // also stops the observation
```

FrameKit uses explicit lifetimes: `detach()` keeps a node reusable, while `destroy()` permanently releases the node and its lifecycle resources. Standalone `subscribe()` calls return an unsubscribe function that the caller owns.

## Spring motion

For interactions that can change direction at any time, create one retained motion controller and keep giving its spring new goals. The spring preserves its current velocity when retargeted and stops scheduling frames after it settles, so there is no playback state to coordinate.

```ts
const motion = fk.createMotion(frame);

fk.on(button, 'MouseEnter', () => {
  motion.spring({
    Position: fk.udim2FromOffset(220, 40),
    Size: fk.udim2FromOffset(180, 64),
    Rotation: 3,
    BackgroundColor3: fk.color3(238, 113, 99),
  });
});

fk.on(button, 'MouseLeave', () => {
  motion.spring({
    Position: fk.udim2FromOffset(200, 48),
    Size: fk.udim2FromOffset(160, 56),
    Rotation: 0,
    BackgroundColor3: fk.color3(247, 241, 234),
  });
});
```

The default spring is nearly critically damped and works without configuration. Pass `tension`, `friction`, or `precision` to `createMotion` when an interaction needs a firmer or bouncier character. Calling `stop()` is optional; motion controllers stop automatically when settled or when their target node is destroyed.

## Tweens

Tweens animate numeric properties and FrameKit values (`Color3`, `Vector2`, `UDim`, and `UDim2`) through the regular property update path. Times are in seconds, and the defaults use a quadratic ease-out.

```ts
const tween = fk.createTween(frame, fk.tweenInfo(0.3, 'Quad', 'Out'), {
  Position: fk.udim2FromOffset(240, 40),
  BackgroundColor3: fk.color3(34, 197, 94),
  BackgroundTransparency: 0.15,
});

tween.completed.subscribe((playbackState) => {
  console.log(playbackState); // 'Completed' or 'Cancelled'
});
tween.play();
```

Tweens support delay, repeats, reversing, pause, and cancellation. Starting a tween cancels an active tween that controls any of the same properties, while tweens over disjoint properties can run together. Destroying the target node cancels its active tweens automatically.

## Project structure

`src/index.ts` exposes only the `fk` namespace. Each source domain owns its construction functions and feeds the namespace through a local `index.ts`:

- `elements` contains DOM-backed controls such as `Frame`, `TextButton`, and `ScreenGui`.
- `modifiers` contains element-less appearance, constraint, and layout nodes.
- `runtime` contains the node tree, lifecycle, rendering, events, and the central `update` path.
- `values` contains immutable Roblox-style values such as `Color3`, `UDim2`, and `Vector2`.

The runtime is the dependency boundary for future capabilities. An animation module can interpolate values and apply them through `update` without knowing how individual elements render, while destruction already owns cancellation cleanup.

Primitive values are frozen structural objects rather than class instances. PascalCase names such as `Color3`, `UDim2`, and `Vector2` are TypeScript types; lowercase functions such as `color3`, `udim2FromOffset`, and `vector2` create their values.

Internal builders live beside the public controls that use them. For example, `elements/text.ts` owns both text label and text button construction, while their shared button input behavior lives in `elements/button.ts`. Internal helpers are not re-exported from their domain barrels.

## Safety boundaries

FrameKit treats caller-provided text as text, never HTML. Image sources accept only `http:`, `https:`, `blob:`, and `data:image/*` URLs, and images use a no-referrer policy. Constructors and updates reject unknown property names, numeric value constructors reject non-finite values, tree operations reject cycles and invalid modifier parents, and destroyed nodes reject further operations.

`GuiNode.element` remains an intentional low-level escape hatch for integrations FrameKit does not cover yet. Code using it has the same trust and security responsibilities as any direct DOM code; prefer FrameKit properties and operations for ordinary application behavior.

## Development

Run the complete local validation suite before committing:

```sh
npm run check
```

Tests mirror source domains under `src/__tests__/elements`, `modifiers`, `runtime`, and `values`. Shared test-only constructors and DOM cleanup live under `src/__tests__/helpers`; they are not part of FrameKit's public API or package exports.

## Inspiration

The inspiration for FrameKit is pretty simple. I come from a Roblox Luau and Roblox-TS background, so Roblox's UI system feels like home to me.

Concepts like `Frame`, `UDim2`, anchor points, and scale/offset positioning make immediate sense in my head. In a way, they are almost ingrained. On the other hand, CSS and variants such as Tailwind have always felt less intuitive to me, especially their syntax and layout rules.

For the longest time, I relied on AI to do all the work for me. That, however, removed all the fun in designing and writing code. Instead of fully escaping my comfort zone, I decided to bring part of that comfort zone with me.
