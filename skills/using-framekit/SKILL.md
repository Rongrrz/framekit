---
name: using-framekit
description: Build or change browser interfaces with FrameKit's persistent TypeScript objects, owned state subscriptions, native interaction, and dynamic collections. Use for FrameKit application code, rather than library-internal refactors.
---

# Using FrameKit

FrameKit objects persist until explicitly destroyed. Compose factories that return a root node;
update those objects from application state. A view factory is called when that view is created,
not on every state change. Import public APIs from `framekit`; optional tools use `framekit/devtools`.

## Set up and compose

Check the consuming project's installed version and existing conventions. This source checkout
is marked private: `npm run build && npm pack` creates an archive another browser application can
install with `npm install /absolute/path/framekit-0.1.0.tgz`. Do not assume it is published.

```ts
import { createFrame, createScreenGui, udim2FromOffset } from 'framekit';

const gui = createScreenGui();
const panel = createFrame({ Size: udim2FromOffset(320, 180) });
panel.Parent = gui;
gui.mount('#app'); // The host page supplies <div id="app"></div>.
// Call gui.destroy() when this application's lifetime ends.
```

Use native button, link, input, and text-area factories for their semantics. Frames accept semantic
creation options as the second argument, for example `{ tagName: 'main' }`. Layout modifiers are
children too. For bulk initial construction, attach the layout after creating the children.

## Keep data and lifetime explicit

- `Parent = undefined` detaches a reusable node. `destroy()` permanently tears down its descendants,
  listeners, animation claims, and owned resources. `unmount()` retains the root's state and resources.
- Use `watchOwnedValue(owner, value, listener)` for state-to-view updates. It delivers immediately,
  returns an idempotent disposer, and unsubscribes on destruction. Detachment keeps it subscribed.
- Computed values take explicit observable dependencies. Include every observable the derivation reads.
- Register external observers, timers, or sockets with `owner.onDestroy(() => cleanup())`.
- Direct writes are synchronous and interrupt animation on the same property. A manual write does
  not remove a watcher; its next notification can write again. Use `setProperties` for one node's
  validated property transaction. There is no global batching contract.

```ts
import { createObservableValue, createTextLabel, watchOwnedValue } from 'framekit';

const count = createObservableValue(0);
const label = createTextLabel();
watchOwnedValue(label, count, (value) => {
  label.Text = String(value);
});
```

Keep shared model state outside disposable view factories. For numeric/color editing, let a native
input retain incomplete text, validate into the model, and normalize on blur. Avoid overwriting its
editing buffer on every model notification. Native input changes synchronize `Text` before
`onTextChanged` and native `input` callbacks.

## Maintain identity in collections

Use `bindKeyedChildren(parent, source, { key, create, update })` for changing collections. Keys are
unique strings or numbers. `create` returns a unique, live, unattached node; `update` runs for new
and retained nodes. Stable keys preserve objects, focus, listeners, and animations. Removed keys
are destroyed. Disposing the binding destroys its generated views.

Do not independently reparent or destroy managed views. Callback mutations are not transactional.
If callbacks need changing item data, read the application model by key rather than closing over
an obsolete item object. Cross-collection transfers are not supported.

`reorderChildren(next)` requires an exact permutation of every direct child, including modifiers.
Logical hierarchy order remains explicit. List/grid layouts sort visual and DOM order by
`LayoutOrder` or `Name`, breaking ties with hierarchy order. Align those values with desired
keyboard order. On browsers without state-preserving DOM moves, FrameKit restores focus and
input selection; other browser-owned state may reset.

For large fixed-height, noninteractive rows, use `bindVirtualList` with a dedicated `ScrollingFrame`,
`itemHeight`, stable keys, create/update callbacks, and observable key `selection`. Optional overscan
is a nonnegative integer. Focus stays on the listbox viewport; mounted rows are options. Offscreen
views are destroyed, so editable drafts and persistent data belong in the model. Selection survives
scrolling out of view. Variable-height rows and virtualized grids are outside this helper's contract.

## Use native interaction and compound semantics

`node.on(eventName, listener, { capture?, passive?, once? })` provides typed native events with owned
cleanup. Nodes expose `focus`, `blur`, `setPointerCapture`, and `releasePointerCapture`. For dragging,
handle pointer cancellation and lost capture as well as pointer-up. Direct manipulation should
write properties directly to interrupt competing motion.

- `bindTreeView(root, visibleRows, { onSelect, onToggle })`: rows contain
  `{ node, level, label, selected?, expanded? }`. Supply visible depth-first rows starting at level 1,
  omit collapsed descendants, and omit `expanded` for leaves. Application state owns selection and
  expansion; the helper owns tree semantics, roving focus, keyboard navigation, and typeahead.
- `bindMenu(trigger, menu, items)`: caller-owned command nodes inside a native popover. The controller
  handles arrows, typeahead, disabled commands, dismissal, and focus restoration. Its `open(vector2)`
  accepts a viewport position for context menus. Use native buttons or links for commands.
- `bindDialog(frame, { initialFocus? })`: create the frame with `{ tagName: 'dialog' }`, label it with
  `aria-label` or `aria-labelledby`, and use `open(trigger)` / `close()`. Supplying the opener makes
  pointer-driven focus restoration consistent across browsers. Closing through `Visible` does not
  close a native modal. The browser supplies top-layer rendering and background inertness.

Keep native text-editing shortcuts intact. Choose a surviving focus target when deleting an
arbitrary focused view; generic keyed reconciliation cannot infer application intent.

## Diagnose and verify

`unsafeElement` supports unsupported attributes, labels, and native integrations. Avoid changing
FrameKit-owned hierarchy or inline styles through it. Use public properties and ownership operations.

All debugging helpers belong to `framekit/devtools`; `toTreeString(root)` formats a hierarchy
without adding debug methods to core instances. For development, conditionally import devtools.
`inspectInstance(node)` returns property,
hierarchy, cleanup-registration, and animation-claim snapshots. `createRuntimeInspector(root)`
creates a separate GUI; mount `inspector.gui` in a host. For an owned `/fkdebug` route, use
`bindRuntimeInspectorRoute(root)`. The binding supplies its own floating Debug
launcher; commands can also call `open()`. Keep debugging UI in devtools rather than duplicating
it in an application.
The host server must serve the same application bootstrap at `/fkdebug` for direct navigation
and refresh. The helper preserves the live root, URL, hash, and browser history, and releases its UI on
exit; the launcher remains until disposal or root destruction. It does not intercept an application's router. Gate the dynamic import behind the bundler's
development constant so the UI stays out of production. Cleanup counts are registrations rather
than exact listener counts.

Verify changed interactions in real browsers when layout, focus, scrolling, or native overlays
matter. The FrameKit repository offers `npm run check`, a separate `npm run test:browser` across
Chromium/Firefox/WebKit, and diagnostic `npm run benchmark`. Its playground demonstrates
persistent routed pages; `/collections.html` demonstrates bounded views for 100,000 items. Browser automation does
not establish how the finished application behaves with assistive technology.
