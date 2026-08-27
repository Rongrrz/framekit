# FrameKit

FrameKit brings Roblox-inspired UI primitives to the browser. Build a typed node tree with familiar values such as `UDim2`, compose behavior with small functions, and render through the DOM without writing a CSS class hierarchy.

```ts
import { append, color3, createFrame, createScreenGui, mount, udim2FromOffset } from 'framekit';

const gui = createScreenGui();
const card = createFrame({
  Size: udim2FromOffset(320, 180),
  BackgroundColor3: color3(238, 113, 99),
  Rotation: 2,
});

append(gui, card);
mount(gui, '#app');
```

Prefer a Roblox-like namespace? The same API is available as `fk`:

```ts
import { fk } from 'framekit';

const gui = fk.createScreenGui();
fk.append(gui, fk.createFrame({ Size: fk.udim2FromOffset(320, 180) }));
fk.mount(gui, '#app');
```

Named imports are useful in applications and libraries that value discoverability and tree shaking. The `fk` namespace keeps examples compact and offers a familiar single entry point. Both forms are first-class and come from the package root.

## The model

FrameKit keeps a small, explicit vocabulary:

| Area       | What you use                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Elements   | `createScreenGui`, `createFrame`, `createScrollingFrame`, text, image, and text-box factories    |
| Modifiers  | `createUICorner`, `createUIStroke`, `createUIShadow`, `createUIGlow`, padding, scale, and layout |
| Tree       | `append`, `detach`, `parent`, `children`, `find`                                                 |
| Properties | `props`, `update`                                                                                |
| Lifecycle  | `mount`, `unmount`, `destroy`, `isDestroyed`                                                     |
| Input      | `on`                                                                                             |
| State      | `state.observable`, `state.observe`, `state.signal`                                              |
| Motion     | `createMotion`, `createTween`, `tweenInfo`                                                       |
| Values     | `color3`, `udim`, `udim2`, `vector2` and their convenience constructors                          |

Factories accept partial property objects. `props()`, `children()`, and `canvasPosition()` return snapshots; mutate FrameKit state through `update()`, tree functions, or `scrollTo()`.

## Elements and modifiers

Elements are DOM-backed nodes. Modifiers are element-less nodes that affect their parent and participate in the same tree and lifecycle.

```ts
const panel = fk.createFrame({
  Name: 'Inventory',
  Position: fk.udim2(0.5, -180, 0.5, -120),
  Size: fk.udim2FromOffset(360, 240),
  BackgroundColor3: fk.color3FromHex('#171820'),
});

fk.append(panel, fk.createUICorner({ CornerRadius: 18 }));
fk.append(
  panel,
  fk.createUIStroke({
    Color: fk.color3FromHex('#9e83ee'),
    Thickness: 2,
    BorderStrokePosition: 'Outer',
  }),
);
fk.append(
  panel,
  fk.createUIPadding({
    PaddingTop: fk.udim(0, 16),
    PaddingRight: fk.udim(0, 16),
    PaddingBottom: fk.udim(0, 16),
    PaddingLeft: fk.udim(0, 16),
  }),
);
```

A parent accepts one modifier of each kind. Duplicate modifiers throw without disturbing either tree. `UIListLayout` controls the positions of its parent's direct GUI children while attached; detaching it restores their own `Position` and `AnchorPoint` rendering.

## Tree, input, and state

Nodes are opaque handles with explicit lifetimes. `detach()` keeps a node reusable; `destroy()` recursively releases it, its descendants, event listeners, observations, and animations.

```ts
const selected = fk.state.observable(false);
const button = fk.createTextButton({ Text: 'Equip' });

fk.on(button, 'MouseEnter', () => selected(true));
fk.on(button, 'MouseLeave', () => selected(false));
fk.on(button, 'MouseButton1Click', () => console.log('equipped'));

fk.state.observe(button, selected, (active) => {
  fk.update(button, { Rotation: active ? 2 : 0 });
});
```

All GUI nodes support hover input. Button nodes add click and press input. `on()` and standalone observable subscriptions return idempotent unsubscribe functions.

Text boxes keep their current string in `Text`, so it is available through either `props(box).Text` or `textBoxText(box)`. `TextChanged` emits that same string as the user edits:

```ts
const bio = fk.createTextBox({
  Text: 'Hello <b>FrameKit</b>',
  RichText: true,
  MultiLine: true,
  PlaceholderText: 'Write something…',
});

fk.on(bio, 'TextChanged', (value) => console.log(value));
```

Rich text is an explicit opt-in and supports bold, italic, underline, strikethrough, line breaks, and validated `font` color, size, and face attributes. Unsupported or executable elements are discarded rather than mounted.

`UIShadow` models box and surface depth with an animated `Offset`, blur, spread, and optional inset. `UIGlow` is deliberately different: it follows the rendered alpha silhouette and builds a centered colored core plus a wider soft halo from only `Radius`, `Color`, and `Transparency`. Both effects can be attached together.

## Spring motion

Use one retained motion controller for interactions that can change direction at any time. Calling `spring()` again retargets from the node's current visual value and preserves that spring's current velocity.

```ts
const scale = fk.createUIScale();
fk.append(button, scale);

const motion = fk.createMotion(scale);
fk.on(button, 'MouseEnter', () => motion.spring({ Scale: 1.04 }));
fk.on(button, 'MouseLeave', () => motion.spring({ Scale: 1 }));
```

`createMotion()` animates numeric properties plus `Color3`, `Vector2`, `UDim`, and `UDim2`, including `Position`, `Size`, `Rotation`, and a scrolling frame's `CanvasPosition`. Its default spring is close to critically damped; `tension`, `friction`, and `precision` are optional. Use `stop()` only when you need to freeze motion at its current value.

Scaling with `UIScale` is useful for hover effects because it changes visual size without asking a `UIListLayout` to reposition neighboring items.

## Tweens

Tweens are the explicit, timed alternative to springs:

```ts
const tween = fk.createTween(panel, fk.tweenInfo(0.3, 'Quad', 'Out'), {
  Position: fk.udim2FromOffset(240, 40),
  BackgroundTransparency: 0.1,
});

tween.completed.subscribe((state) => console.log(state));
tween.play();
```

Tweens support delay, repeats, reversing, pause, and cancellation. A new animation that claims the same property cancels the previous owner of that property; disjoint properties can animate concurrently. A newly played tween snapshots the property's current value, so interrupting a halfway-complete tween continues from that visible midpoint rather than its original start.

## Package organization

The public contract lives in `src/api.ts`; `src/index.ts` deliberately exposes it both as named exports and as `fk`. Source domains own their implementation and local barrel:

- `elements` — DOM-backed controls and input behavior
- `modifiers` — element-less style, constraint, and layout nodes
- `animation` — springs, tweens, ownership, and shared value interpolation
- `state` — observable values and signals
- `runtime` — internal tree, rendering, property, event, and lifecycle machinery
- `values` — immutable Roblox-style structural values

Types such as `Color3`, `UDim2`, `GuiNode`, `StyleModifierNode`, and `LayoutNode` are exported from the root. Lowercase functions create values; PascalCase names describe their TypeScript types.

The runtime remains an implementation boundary rather than a secondary public entry point. Package consumers should import only from `framekit`.

## Safety boundaries

FrameKit treats ordinary caller-provided text as text, never HTML. A text box with `RichText: true` parses only FrameKit's documented, non-executable formatting subset into newly created DOM nodes. Image sources accept only `http:`, `https:`, `blob:`, and `data:image/*` URLs and use a no-referrer policy. Constructors and updates reject unknown properties, value constructors reject non-finite numbers, tree operations reject cycles and invalid modifier parents, and destroyed nodes reject further operations.

`GuiNode.element` is an intentional low-level escape hatch for integrations FrameKit does not cover. Prefer FrameKit properties and operations for normal application behavior.

## Playground and development

The playground is a complete, long-form FrameKit product page built with FrameKit itself. It demonstrates composition, scale/offset `UDim2` layout, modifiers, observable state, input, spring motion, tweens, scrolling, and lifecycle patterns.

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
