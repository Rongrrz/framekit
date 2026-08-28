# FrameKit

FrameKit brings an engine-style UI object model to the browser. Create typed nodes, arrange them in an explicit tree, change their properties, and connect events. If you have used Roblox Instances—or scene trees in other engines—the ownership model should feel familiar.

```ts
import { fk } from 'framekit';

const gui = fk.createScreenGui();
const card = fk.createFrame({
  Size: fk.udim2FromOffset(320, 180),
  BackgroundColor3: fk.color3FromRGB(238, 113, 99),
  Rotation: 2,
});

gui.addChild(card);
gui.mount('#app');
```

FrameKit exposes three focused namespaces:

```ts
import { fk, fka, fkh } from 'framekit';
```

- `fk` contains core nodes, values, state, events, and hierarchy APIs.
- `fka` contains springs, tweens, easing, and animation controllers.
- `fkh` contains optional helpers that compose an opinionated interaction pattern.

Each API has one canonical location; FrameKit does not expose parallel root-level function aliases.

## The model

FrameKit has no components, render functions, hooks, throwaway virtual trees, dependency arrays, or implicit rerender rules. A factory creates one persistent object. Those objects form an inspectable hierarchy—the FrameKit representation of your UI—and FrameKit keeps the browser DOM synchronized with it immediately. The hierarchy is never recreated or diffed behind your back.

The common vocabulary is deliberately small:

| Area          | What you use                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------ |
| Elements      | `createScreenGui`, `createFrame`, `createScrollingFrame`, text, image, and text-box factories    |
| Modifiers     | `createUICorner`, `createUIStroke`, `createUIShadow`, `createUIGlow`, padding, scale, and layout |
| Hierarchy     | `Parent`, `ClassName`, `addChild`, `getChildren`, `getDescendants`, `findFirstChild`             |
| Properties    | `node.Text`, `node.Position`; `node.setProperties({...})` for a batch                            |
| Lifecycle     | `node.destroy`, `isDestroyed`, `onDestroy`; `gui.mount` and `unmount`                            |
| Input         | `node.onClick`, `node.onMouseEnter`, and other capability-specific methods                       |
| Shared values | `createValue`, `node.watch`; optional when a plain variable is enough                            |
| Motion        | `fka.spring`, `fka.createMotion`, `fka.createTween`, `fka.tweenInfo`                             |
| Helpers       | `fkh.bindHoverScale`, `fkh.setModifierAttached`, `fkh.createSpringModifierToggle`                |
| Values        | `color3FromRGB`, `udim`, `udim2`, `vector2` and their convenience constructors                   |

Factories accept initial properties. After creation, properties behave like engine object properties:

```ts
card.Name = 'Inventory';
card.Visible = false;

card.setProperties({
  Position: fk.udim2FromOffset(40, 80),
  Rotation: 4,
});
```

Assignments and `setProperties()` are validated and applied immediately. They never rerun application code or recreate the node. Use `setProperties()` when several changes belong to one update; otherwise direct assignment is the simplest option.

## Elements and modifiers

Elements are DOM-backed nodes. Modifiers are element-less nodes that affect their parent and participate in the same tree and lifecycle.

```ts
const panel = fk.createFrame({
  Name: 'Inventory',
  Position: fk.udim2(0.5, -180, 0.5, -120),
  Size: fk.udim2FromOffset(360, 240),
  BackgroundColor3: fk.color3FromHex('#171820'),
});

panel.addChild(fk.createUICorner({ CornerRadius: 18 }));
panel.addChild(
  fk.createUIStroke({
    Color: fk.color3FromHex('#9e83ee'),
    Thickness: 2,
    BorderStrokePosition: 'Outer',
  }),
);
panel.addChild(
  fk.createUIPadding({
    PaddingTop: fk.udim(0, 16),
    PaddingRight: fk.udim(0, 16),
    PaddingBottom: fk.udim(0, 16),
    PaddingLeft: fk.udim(0, 16),
  }),
);
```

A parent accepts one modifier of each kind. Duplicate modifiers throw without disturbing either tree. `UIListLayout` controls the positions of its parent's direct GUI children while attached; detaching it restores their own `Position` and `AnchorPoint` rendering.

Use `fkh` when its optional interaction conventions fit your UI. `bindHoverScale()` adds a retained `UIScale`; `setModifierAttached()` toggles a modifier without recreating it; and `createSpringModifierToggle()` animates a modifier out before detaching it.

## Hierarchy and input

Nodes are persistent objects with explicit ownership. `removeFromParent()` keeps a node reusable. `destroy()` recursively releases its descendants, event listeners, watched values, and animations.

`Name` is editable application data. `ClassName` identifies the node's concrete FrameKit type. `Parent` is a live hierarchy property: assign another node to reparent, or `undefined` to detach. `addChild()` is the convenient parent-first spelling of the same operation.

```ts
const menu = fk.createFrame({ Name: 'InventoryMenu' });
const equip = fk.createTextButton({ Name: 'EquipButton', Text: 'Equip' });

equip.Parent = menu;

equip.Parent === menu; // true
menu.getChildren(); // [equip]
menu.findFirstChild('EquipButton'); // equip
equip.getFullName(); // "InventoryMenu.EquipButton"
```

Traversal reads the FrameKit hierarchy, not the HTML DOM. `getChildren()` returns direct children; `getDescendants()` returns every nested node in depth-first order. Both return snapshots, so callers cannot mutate FrameKit's internal child list.

Every node can format or print its current subtree:

```ts
gui.printTree();
```

```text
ScreenGui [ScreenGui]
└─ InventoryMenu [Frame]
   ├─ UICorner [UICorner]
   └─ EquipButton [TextButton]
```

Use `toTreeString()` when you want the same output without writing to the console—for example in a custom inspector or a test assertion.

```ts
const button = fk.createTextButton({ Text: 'Equip' });

button.onMouseEnter(() => {
  button.Rotation = 2;
});
button.onMouseLeave(() => {
  button.Rotation = 0;
});
button.onClick(() => console.log('equipped'));
```

Event connections belong to the node and are released when it is destroyed. Each event method also returns an unsubscribe function for stopping it earlier.

Most local interactions need only ordinary variables and direct property assignments. When several objects need the same piece of state, `createValue()` provides explicit `get()`, `set()`, and `update()` methods. `node.watch()` runs once immediately, runs again when the value changes, and stops automatically when that node is destroyed:

```ts
const selectedItem = fk.createValue('Sword');
label.watch(selectedItem, (item) => {
  label.Text = item;
});
```

There is no dependency tracking or render cycle. A watched callback is simply a synchronous callback.

All GUI nodes expose `onMouseEnter()` and `onMouseLeave()`. Button nodes add `onClick()`, primary-button, and secondary-button methods.

Text boxes keep their current string in `Text`, available through `box.Text`. `onTextChanged()` emits that same string as the user edits:

```ts
const bio = fk.createTextBox({
  Text: 'Hello <b>FrameKit</b>',
  RichText: true,
  MultiLine: true,
  PlaceholderText: 'Write something…',
});

bio.onTextChanged((value) => console.log(value));
```

Rich text is an explicit opt-in and supports bold, italic, underline, strikethrough, line breaks, and validated `font` color, size, and face attributes. Unsupported or executable elements are discarded rather than mounted.

`UIShadow` models box and surface depth with an animated `Offset`, blur, spread, and optional inset. `UIGlow` is deliberately different: it follows the rendered alpha silhouette and builds a centered colored core plus a wider soft halo from only `Radius`, `Color`, and `Transparency`. Both effects can be attached together.

## Spring motion

Call `fka.spring()` with a node and its goal. FrameKit retains the spring for you, so calling it again retargets from the current visual value and preserves velocity.

```ts
const scale = fk.createUIScale();
button.addChild(scale);

button.onMouseEnter(() => fka.spring(scale, { Scale: 1.04 }));
button.onMouseLeave(() => fka.spring(scale, { Scale: 1 }));
```

The default matches Ripple's physical spring: `{ tension: 170, friction: 26, mass: 1, precision: 0.001, restVelocity: 0.0625 }`. Most interactions should leave it alone. When a particular motion needs a different feel, pass a separate settings object:

```ts
fka.spring(panel, { Rotation: 4 }, { tension: 210, friction: 20 });
```

`fka.spring()` animates numeric properties plus `fk.Color3`, `fk.Vector2`, `fk.UDim`, and `fk.UDim2`, including `Position`, `Size`, `Rotation`, and a scrolling frame's `CanvasPosition`. `mass`, `precision`, and `restVelocity` are also available. Use the advanced `fka.createMotion()` controller only when you need its `completed`, `isAnimating()`, or `stop()` controls.

Assigning a property or including it in `setProperties()` immediately stops any spring or tween controlling that property. Animations on other properties continue. A direct write always wins; there is no hidden animation priority to remember.

For scrolling frames, wheel, touch, keyboard, and assigning `scrollingFrame.CanvasPosition` immediately take control from an active animation. Scroll events produced by the animation itself do not interrupt it.

Scaling with `UIScale` is useful for hover effects because it changes visual size without asking a `UIListLayout` to reposition neighboring items.

## Tweens

Tweens are the explicit, timed alternative to springs:

```ts
const tween = fka.createTween(panel, fka.tweenInfo(0.3, 'Quad', 'Out'), {
  Position: fk.udim2FromOffset(240, 40),
  BackgroundTransparency: 0.1,
});

tween.completed.subscribe((state) => console.log(state));
tween.play();
```

Tweens support delay, repeats, reversing, pause, and cancellation. A new animation that claims the same property cancels the previous owner of that property; disjoint properties can animate concurrently. A newly played tween snapshots the property's current value, so interrupting a halfway-complete tween continues from that visible midpoint rather than its original start.

## Package organization

The package entry point exposes only `fk`, `fka`, and `fkh`. Source domains own their implementation and local barrel:

- `core` — public core barrel exposed as `fk`
- `elements` — DOM-backed controls and input behavior
- `modifiers` — element-less style, constraint, and layout nodes
- `animation` — spring and tween controllers, physics, easing, and value interpolation
- `helpers` — optional composed behavior exposed as `fkh`
- `state` — explicit shared values and signals
- `runtime` — internal node state, trees, rendering, property ownership, events, and cleanup
- `values` — immutable Roblox-style structural values

Core types are available through `fk`, while animation types are available through `fka`:

```ts
function show(panel: fk.FrameNode, motion: fka.Motion<fk.FrameProperties>): void {
  motion.spring({ BackgroundTransparency: 0 });
}
```

The runtime remains an implementation boundary rather than a secondary public entry point. Package consumers should import only from `framekit`.

## Safety boundaries

FrameKit treats ordinary caller-provided text as text, never HTML. A text box with `RichText: true` parses only FrameKit's documented, non-executable formatting subset into newly created DOM nodes. Image sources accept only `http:`, `https:`, `blob:`, and `data:image/*` URLs and use a no-referrer policy. Constructors and updates reject unknown properties, missing values, non-finite numbers, and invalid runtime enum members. Tree operations reject cycles and invalid modifier parents, and destroyed nodes reject further operations.

`GuiNode.element` is an intentional low-level escape hatch for integrations FrameKit does not cover. Prefer FrameKit properties and operations for normal application behavior.

## Playground and development

The playground is a complete, long-form FrameKit product page built with FrameKit itself. It demonstrates composition, scale/offset `UDim2` layout, modifiers, shared values, input, spring motion, tweens, scrolling, and lifecycle patterns.

Its desktop/mobile module boundaries and extension rules are documented in [`playground/README.md`](playground/README.md).

```sh
npm run dev                 # playground development server
npm run build:playground    # production playground build
npm run build:library       # package bundles and declarations
npm run check               # formatting, types, lint, tests, and both builds
```

Tests mirror the source domains under `src/__tests__`. Test helpers are not part of the package API.

## Inspiration

FrameKit grew from a Roblox Luau and Roblox-TS background, where `Frame`, `UDim2`, anchor points, scale/offset positioning, and explicit UI instances feel natural. Its goal is not to recreate every Roblox API or hide the browser. It is to preserve that productive mental model while providing a small, typed, browser-native toolkit.
