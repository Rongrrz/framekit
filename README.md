# FrameKit

FrameKit brings an engine-style UI object model to the browser. Create typed, persistent instances, arrange them in an explicit tree, update their properties, and connect events. If you know Roblox Instances or scene trees, the ownership model should feel familiar.

```ts
import { color3FromRGB, createFrame, createScreenGui, udim2FromOffset } from 'framekit';

const gui = createScreenGui();
const card = createFrame({
  Size: udim2FromOffset(320, 180),
  BackgroundColor3: color3FromRGB(238, 113, 99),
});

card.Parent = gui;
gui.mount('#app');
```

FrameKit has no components, render functions, hooks, virtual tree, or implicit rerendering. A factory creates one object, FrameKit keeps its DOM element synchronized, and `Parent` defines ownership.

## Core API

Everything is available from the `framekit` entry point.

| Area      | API                                                                                    |
| --------- | -------------------------------------------------------------------------------------- |
| Elements  | `createScreenGui`, `createFrame`, text, image, link, and native text-control factories |
| Modifiers | Corners, gradients, strokes, shadows, padding, scale, aspect ratio, and list layout    |
| Hierarchy | `Parent`, `isA`, `getChildren`, `getDescendants`, `findFirstChild`                     |
| Lifecycle | `mount`, `unmount`, `destroy`, `onDestroy`                                             |
| State     | Direct properties, property observers, observable and computed values                  |
| Motion    | `spring`, `createTween`                                                                |
| Helpers   | Tooltips, popovers, hover scale, and responsive layouts                                |
| Values    | `Color3`, `UDim`, `UDim2`, `Vector2`, and sequences                                    |

Properties are typed, validated, and applied immediately:

```ts
card.Name = 'Inventory';
card.Visible = false;
card.setProperties({ Position: udim2FromOffset(40, 80), Rotation: 4 });
```

Elements are DOM-backed. Modifiers are element-less children that affect their parent and share its lifecycle:

```ts
import {
  createTextButton,
  createUICorner,
  createUIGradient,
  color3FromHex,
  colorSequence,
  spring,
} from 'framekit';

const button = createTextButton({ Text: 'Equip' });
createUICorner({ CornerRadius: 12 }).Parent = button;
createUIGradient({
  Color: colorSequence(color3FromHex('#9e83ee'), color3FromHex('#5f9cf5')),
}).Parent = button;

button.onMouseEnter(() => spring(button, { Rotation: 2 }));
button.onMouseLeave(() => spring(button, { Rotation: 0 }));
button.onClick(() => console.log('equipped'));
button.Parent = card;
```

Use semantic creation options when appropriate: frames can render as `main`, `section`, `article`, `nav`, and related elements; text can render as headings, paragraphs, code, and more. Buttons, links, inputs, and text areas use their native HTML elements.

## Ownership and lifecycle

Setting `Parent = undefined` detaches a reusable node. `destroy()` recursively releases descendants, listeners, subscriptions, and animations. Event methods return an unsubscribe function, and `onDestroy()` can own other cleanup.

Traversal reads the FrameKit tree rather than the DOM. `isA()` narrows concrete TypeScript types, while `toTreeString()` provides an inspectable hierarchy for debugging and tests.

Direct writes take control of animated properties. Springs preserve velocity when retargeted; tweens support delay, repeats, reversing, pause, and cancellation. Animations on unrelated properties can run concurrently.

For the complete runtime sequence, see [FRAMEKIT_LIFECYCLE.md](FRAMEKIT_LIFECYCLE.md).

## Browser behavior and safety

FrameKit exposes readonly browser geometry, native scrolling, keyboard-aware nested scrolling, text scaling, accessible labels, reduced-motion behavior, and focus-aware tooltips and popovers.

Caller text is never treated as HTML. Image protocols and property values are validated, hierarchy cycles are rejected, and cross-document trees are not allowed. `unsafeElement` is available for integrations, but should not mutate FrameKit-owned hierarchy or inline styles.

FrameKit installs one shared stylesheet per document. For a nonce-based Content Security Policy, call `installFrameKitStyles({ nonce })` before creating nodes.

## Development

The playground is a documentation site built entirely with FrameKit. See [playground/README.md](playground/README.md) for its architecture.

```sh
npm run dev              # start the playground
npm test                 # run library tests
npm run test:playground  # run playground tests
npm run build            # build the package
npm run check            # run every quality gate
```

Package consumers should import only from `framekit`. Internal modules are implementation details.
