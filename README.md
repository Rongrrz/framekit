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

Runtime APIs are available from `framekit`. Optional inspection tools use `framekit/devtools`.

| Area        | API                                                                                    |
| ----------- | -------------------------------------------------------------------------------------- |
| Elements    | `createScreenGui`, `createFrame`, text, image, link, and native text-control factories |
| Modifiers   | Corners, gradients, strokes, shadows, padding, scale, aspect ratio, and list layout    |
| Hierarchy   | `Parent`, `isA`, `getChildren`, `getDescendants`, `findFirstChild`                     |
| Lifecycle   | `mount`, `unmount`, `destroy`, `onDestroy`                                             |
| State       | Direct properties, property observers, observable and computed values, owned watchers  |
| Collections | Keyed children and fixed-height virtual lists                                          |
| Motion      | `spring`, `createTween`                                                                |
| Helpers     | Tooltips, popovers, hover scale, and responsive layouts                                |
| Values      | `Color3`, `UDim`, `UDim2`, `Vector2`, and sequences                                    |

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

Traversal reads the FrameKit tree rather than the DOM. `isA()` narrows concrete TypeScript types, while `toTreeString(root)` from `framekit/devtools` formats a hierarchy for debugging and tests.

Direct writes take control of animated properties. Springs preserve velocity when retargeted; tweens support delay, repeats, reversing, pause, and cancellation. Animations on unrelated properties can run concurrently.

For the complete runtime sequence, see [FRAMEKIT_LIFECYCLE.md](FRAMEKIT_LIFECYCLE.md).

## Browser behavior and safety

FrameKit exposes readonly browser geometry, native scrolling, keyboard-aware nested scrolling, text scaling, accessible labels, reduced-motion behavior, and focus-aware tooltips and popovers.

Caller text is never treated as HTML. Image protocols and property values are validated, hierarchy cycles are rejected, and cross-document trees are not allowed. `unsafeElement` is available for integrations, but should not mutate FrameKit-owned hierarchy or inline styles.

FrameKit installs one shared stylesheet per document. For a nonce-based Content Security Policy, call `installFrameKitStyles({ nonce })` before creating nodes.

Inspector snapshots redact password-input text. The [security and stack review](docs/security-and-stack-audit.md)
describes the checked boundaries, dependency maintenance, and responsibilities of host applications.

## Development

Use the patched Node 24 LTS version in `.nvmrc` (`nvm install && nvm use`), then `npm ci`.

The playground includes a documentation site and a 100,000-item virtual collection (`/collections.html`), built with FrameKit. See [playground/README.md](playground/README.md) for its architecture.

```sh
npm run dev              # start the playground
npm test                 # run library tests
npm run test:playground  # run playground tests
npm run test:browser     # Chromium, Firefox, WebKit (install browsers first)
npm run benchmark        # record browser performance diagnostics
npm run build            # build the package
npm run check            # quick static checks: formatting, types, lint
npm run check:all        # full local pipeline: tests, builds, packaged consumers
```

Package consumers should import from `framekit` or the optional `framekit/devtools` entry. Internal modules are implementation details.

## Build applications

This checkout is marked `private`; use `npm run build` followed by `npm pack`, then install the
resulting archive in your application. The [application guide](docs/APPLICATION_GUIDE.md) includes
the exact installation steps, a complete dynamic interface, and contracts for state, ordering,
input, accessibility, virtualization, and diagnostics. [Performance diagnostics](benchmarks/README.md)
include reproducible workloads and the first measured DOM baseline.

Before browser tests, run `npx playwright install chromium firefox webkit`. Browser checks run in
a separate CI job. Locally, run tests for the behavior you changed and type-check once.
`npm run check` runs static checks; `npm run check:all` adds all unit tests, builds, and packaged
consumer contracts. The commit hook checks formatting and lint.

For agent-assisted application work, start with [SKILLS.md](SKILLS.md).

During development, **Debug tools** opens a searchable runtime hierarchy, element picker,
and grouped live properties without changing the current URL. Drag the inspector by its title
bar and resize it from any edge or corner. Keyboard equivalents are available on the title
bar and resize handles; Home on the title bar resets the window.

```ts
import { bindRuntimeInspector } from 'framekit/devtools';

const debug = bindRuntimeInspector(app, {
  button: true, // Default. Set false for a shortcut or your own controls.
  shortcut: { key: 'D', ctrlKey: true, shiftKey: true }, // Optional; toggles open/closed.
});
// debug.open(); debug.close(); debug.dispose();
```

Omit `shortcut` for button-only use. Set `button: false` and omit `shortcut` for programmatic
controls. Modifiers match exactly; omitted modifiers mean false. Unmodified shortcuts leave
text editing alone, except function keys. Modified shortcuts also work in inspector search.
The binding owns the launcher, shortcut listener, and open inspector; destroying the supplied
root releases them. Keep this integration behind your bundler's development flag.

The Playground uses the button and **F8**. Its documentation has separate chapters for
elements, layout, state and collections, ownership, animation, overlays, and devtools, with
an API overview at `#/api`. See [Playground architecture](playground/README.md).
