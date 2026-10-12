# Building an application with FrameKit

FrameKit objects are persistent. Application state describes the interface; owned callbacks
update existing objects. `Parent` defines the ownership tree. No render function recreates it.

Start with `playground/src/workbench/app.ts` in the repository for a larger example, or run
`npm run dev` and open `/workbench.html`. Open `/collections.html` to inspect a 100,000-item
virtual list. The workbench's data commands and history live in `model.ts`; its views consume
that state through the public package API.

## Use this checkout from another project

This checkout is marked `private`. Build and pack it locally:

```sh
# In the FrameKit checkout:
npm ci
npm run build
npm pack

# In your browser application:
npm install /absolute/path/to/framekit/framekit-0.1.0.tgz
```

Import runtime APIs from `framekit`. Use `framekit/devtools` only for optional development tools.
The source module paths are implementation details. Rebuild and repack after changing FrameKit.

## A complete dynamic interface

Add `<div id="app"></div>` to the page and run this TypeScript in a browser entry point. This
example creates a searchable collection, retains rows by key, observes selected state, and
cleans up each row's listeners and subscriptions when it is removed.

```ts
import {
  bindKeyedChildren,
  color3FromHex,
  createComputedValue,
  createFrame,
  createObservableValue,
  createScreenGui,
  createTextButton,
  createTextInput,
  createTextLabel,
  createUIListLayout,
  udim,
  udim2FromOffset,
  watchOwnedValue,
} from 'framekit';

type Item = Readonly<{ id: string; label: string }>;
const items = createObservableValue<readonly Item[]>([
  { id: 'first', label: 'First item' },
  { id: 'second', label: 'Second item' },
]);
const selected = createObservableValue<string | undefined>(undefined);
const query = createObservableValue('');
const filtered = createComputedValue([items, query], () =>
  items.get().filter((item) => item.label.toLowerCase().includes(query.get().toLowerCase())),
);

const app = createScreenGui();
const title = createTextLabel({
  Size: udim2FromOffset(400, 36),
  BackgroundTransparency: 1,
  TextXAlignment: 'Left',
});
title.Parent = app;
watchOwnedValue(title, items, (current) => {
  title.Text = `${current.length} items`;
});

const search = createTextInput({
  AccessibleLabel: 'Search items',
  PlaceholderText: 'Search…',
  Position: udim2FromOffset(0, 44),
  Size: udim2FromOffset(400, 36),
});
search.Parent = app;
search.onTextChanged((text) => query.set(text));

const list = createFrame({
  Position: udim2FromOffset(0, 132),
  Size: udim2FromOffset(400, 0),
  AutomaticSize: 'Y',
  BackgroundTransparency: 1,
});
list.Parent = app;
bindKeyedChildren(list, filtered, {
  key: (item) => item.id,
  create: (item) => {
    const row = createTextButton({ Size: udim2FromOffset(400, 36) });
    row.onClick(() => selected.set(item.id));
    watchOwnedValue(row, selected, (id) => {
      row.BackgroundColor3 = color3FromHex(id === item.id ? '#76edad' : '#c8c8c8');
      row.unsafeElement.setAttribute('aria-pressed', String(id === item.id));
    });
    return row;
  },
  update: (row, item) => {
    row.Text = item.label;
  },
});
createUIListLayout({ Padding: udim(0, 8) }).Parent = list;

let nextId = 0;
const add = createTextButton({
  Text: 'Add',
  Position: udim2FromOffset(0, 88),
  Size: udim2FromOffset(192, 36),
});
add.Parent = app;
add.onClick(() => {
  nextId += 1;
  items.update((current) => [...current, { id: `added-${nextId}`, label: `Item ${nextId}` }]);
});
const remove = createTextButton({
  Text: 'Remove selected',
  Position: udim2FromOffset(208, 88),
  Size: udim2FromOffset(192, 36),
});
remove.Parent = app;
remove.onClick(() => {
  items.update((current) => current.filter((item) => item.id !== selected.get()));
  selected.set(undefined);
});

app.mount('#app');
// The surrounding application's teardown should call app.destroy().
```

A factory can compose several nodes and return its root. Keep shared data outside those factories;
let the root own subscriptions and browser resources. Factories do not require a component class
or a new lifecycle system.

## State and property writes

`watchOwnedValue(owner, value, listener)` subscribes before immediately delivering `value.get()`.
That prevents changes made during initial delivery from being lost. It returns an idempotent
disposer, unsubscribes when the owner is destroyed, and releases its subscription if initial
delivery throws. Detaching or unmounting the owner keeps it subscribed.

Computed values require explicit dependencies. Include every observable read by the derivation.
When no one observes a computed value, it releases source subscriptions and derives on demand.

| Operation                  | Behavior                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| Direct property assignment | Validates and updates immediately; interrupts animation on that property, even for equal-value writes |
| `setProperties(patch)`     | One synchronous property transaction on one node                                                      |
| Owned watcher callback     | Uses ordinary writes or animation calls; it does not claim permanent ownership of a property          |
| Manual write after binding | Changes the current value; does not unsubscribe a watcher                                             |
| Invalid property patch     | Rejected before committing; emits no property notifications                                           |
| Callback-triggered write   | Runs synchronously and can nest; avoid application feedback loops                                     |

User typing is synchronized to `Text` before `onTextChanged` and native `input` listeners run.
Update state in `onTextChanged`; use an owned watcher for programmatic changes back to the input.
Avoid rewriting an actively edited field with incomplete numeric or color data. The workbench
inspector keeps the editing buffer in the native input, validates into the model, and normalizes
on blur. Its focus/blur events group an edit into one undo step.

## Identity, ownership, and ordering

`bindKeyedChildren(parent, source, { key, create, update })` owns the generated views. Return
unique, live, unattached nodes from `create`; `update` runs for both new and retained nodes.
Keys must be unique strings or numbers. Duplicates are rejected before views change. Retained
keys keep the same objects, listeners, and animations; removed keys are destroyed. Explicit
disposal destroys the generated views without destroying the parent or unrelated children.
Do not independently destroy or reparent a managed view. Cross-collection transfers are not
part of this API. User callback mutations are not rolled back if an update fails.

`parent.reorderChildren(nextChildren)` accepts the exact permutation of all direct children,
including modifiers. It preserves identity. Hierarchy order is explicit; a list/grid layout
sorts DOM and visual order by `LayoutOrder` or `Name`, using hierarchy order to break ties.
Removing the layout restores DOM order to hierarchy order. These distinctions matter when
keyboard navigation and data ordering need to agree.

Native state-preserving DOM moves are used where available. The fallback restores connected
focus and input/textarea selection; it does not promise to preserve every browser-owned state,
such as an iframe's document. Deletion needs an application focus fallback. Tree navigation
provides one for visible rows; a general collection cannot infer your application's next target.

Use `Parent = undefined` to detach reusable objects. Use `destroy()` for permanent recursive
teardown. A root `unmount()` keeps its hierarchy, state, watchers, and animations alive.
Register external observers, timers, and sockets with the owner:

```ts
const controller = new AbortController();
window.addEventListener('resize', updateLayout, { signal: controller.signal });
owner.onDestroy(() => controller.abort());
```

Cleanup continues after individual callbacks fail. Destruction reports one error or an
`AggregateError`; repeatedly destroying an already-destroyed node is harmless.

## Keyboard, pointer, and compound controls

Every GUI-backed object has `on(eventName, listener, options?)`, `focus`, `blur`,
`setPointerCapture`, and `releasePointerCapture`. Event types follow `HTMLElementEventMap`.
Listener options are `capture`, `passive`, and `once`; the node owns the listener lifetime.
Use pointer capture for dragging across element boundaries, and handle cancellation and lost
capture. Native buttons and links already provide keyboard activation.

- `bindTreeView(root, rows, { onSelect, onToggle })` takes visible depth-first rows with
  `{ node, level, label, selected?, expanded? }`. Start at level 1; omit collapsed descendants.
  Omit `expanded` for leaves. Selection and expansion live in application state. The helper owns
  ARIA attributes, roving focus, arrows, Home/End, typeahead, and Enter/Space selection. Native
  text inputs retain their editing keys. Removing a focused row chooses a surviving row.
- `bindMenu(trigger, menu, items)` uses a native popover for a single-level command menu. Supply
  caller-owned content and command nodes. It handles opening, arrows, Home/End, typeahead,
  disabled commands, Tab, Escape, and outside dismissal. `controller.open(vector2(x, y))` opens
  a context menu at viewport coordinates. Use native buttons or links for commands.
- `bindDialog(frame, { initialFocus? })` requires `createFrame(props, { tagName: 'dialog' })`.
  Label the native dialog with `aria-label` or `aria-labelledby`. Call `controller.open(trigger)`
  to explicitly restore focus to a pointer-activated opener across browsers. Native modal
  behavior provides top-layer rendering, inert background content, focus containment, and
  nested Escape handling. Call `close()` rather than changing `Visible` to close the modal.

The application still chooses labels, selection policy, and what each command does. Browser
checks do not replace a manual assistive-technology review for the finished application.

## Large collections

`bindVirtualList(viewport, source, options)` owns a content frame and the viewport's canvas
geometry. Supply a dedicated `ScrollingFrame`, positive fixed `itemHeight`, stable keys,
`create`/`update` callbacks, and an observable `selection` containing a key or `undefined`.
Optional `overscan` is a nonnegative integer, defaulting to 2.

```ts
const selection = createObservableValue<string | number | undefined>(undefined);
const controller = bindVirtualList(viewport, items, {
  itemHeight: 32,
  key: (item) => item.id,
  selection,
  create: () => createTextLabel({ TextXAlignment: 'Left' }),
  update: (row, item) => {
    row.Text = item.label;
  },
});
controller.scrollToKey('second');
```

Rows are listbox options: use noninteractive content. Focus stays on the viewport, with
`aria-activedescendant` identifying the mounted selected option. Arrow keys, Home/End, and
Page Up/Down update selection and scroll it into view. If a selected option scrolls away, its
view is destroyed and the active-descendant reference is removed; data selection survives.
A remounted key gets a new view. Preserve editable draft data in the application model.

Source changes preserve the first visible key and its pixel offset when possible. Explicit
disposal destroys generated content, disconnects observation, and restores viewport settings.
Variable-height rows and grids are outside the current contract.

## Motion and diagnostics

Springs preserve velocity when retargeted. Tweens support timed playback, interruption, and
reversing. Animation claims are per property, so unrelated properties can animate concurrently.
A new claim or direct write takes control of the affected property. For an owned animated
binding, call `spring(node, goal)` from `watchOwnedValue`; there is no second binding ownership
system. Direct manipulation should write directly so it interrupts an animation predictably.

Use `toTreeString()` and `onPropertyChanged()` for simple diagnostics. Optional development UI:

```ts
// Keep this branch behind your bundler's development constant.
if (import.meta.env.DEV) {
  const { createRuntimeInspector } = await import('framekit/devtools');
  const inspector = createRuntimeInspector(app);
  inspector.gui.mount('#app');
}
```

`inspectInstance(node)` provides readonly property and hierarchy snapshots, cleanup registration
counts, and animated property names. It can inspect destroyed handles. Counts represent cleanup
registrations, not individual listeners. The UI refreshes every 250 ms and releases its timer when
closed or when the inspected root is destroyed. In the workbench, use `?inspect=1` during development.

`unsafeElement` is useful for native integration, labels, input modes, and unsupported attributes.
Do not mutate FrameKit-owned hierarchy or inline styles through it. Use public geometry,
properties, and lifecycle-aware input operations for normal interaction.

For exact runtime sequencing, read [FRAMEKIT_LIFECYCLE.md](../FRAMEKIT_LIFECYCLE.md). For measured
performance and methodology, read [benchmarks/README.md](../benchmarks/README.md).
