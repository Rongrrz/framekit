# Building an application with FrameKit

FrameKit objects are persistent. Application state describes the interface; owned callbacks
update existing objects. `Parent` defines the ownership tree. No render function recreates it.

Start with `project-landing/src/app.ts` in the repository for a complete routed interface, or run
`npm run dev` and open `/`. Use the shared Debug launcher to inspect its live
FrameKit hierarchy. Open `/collections.html` for a 100,000-item virtual list.

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

Put semantic tag choices in the first property object: `createFrame({ TagName: 'article' })`
or `createTextLabel({ Text: 'Profile', TextTagName: 'h2' })`. ImageLabel and ScrollingFrame also
accept `TagName`. These choices are fixed after creation; `setProperties` cannot replace the
native element. The optional second argument selects the DOM environment, for example
`{ ownerDocument: iframe.contentDocument }`.

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
delivery throws. Later listener failures are reported through FrameKit's observer error handling;
other observers still run. Detaching or unmounting the owner keeps it subscribed.

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
Avoid rewriting an actively edited field with incomplete numeric or color data. Keep the editing
buffer in the native input, validate into application state, and normalize on blur.

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

Local keyboard events go to the focused element and bubble through its DOM ancestors. Hovering
alone does not send keyboard input to a button. Use local handlers for a control's own behavior,
such as arrow navigation, and `createUserInputService(owner)` for application-wide keyboard input:

```ts
import { createUserInputService } from 'framekit';

const input = createUserInputService(app);
input.inputBegan.subscribe((event, processed) => {
  if (processed || event.altKey || event.shiftKey) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    saveProfile();
  }
});
```

Reuse one service per application. `inputBegan` and `inputEnded` deliver a native `KeyboardEvent`
and a `processed` boolean: true for default-prevented events or text-editing targets (input,
textarea, select, or editable content). Listeners run on the owner's document after local bubbling
handlers. A handler that stops propagation prevents the service from seeing the event.
Repeated keydown and composition events are ignored. `isKeyDown('KeyW')` reads physical
`KeyboardEvent.code` state, including processed input. Window blur or a hidden document clears
held keys. `dispose()` and owner destruction remove document listeners and signal subscriptions;
detaching or unmounting the owner retains the service.

- `bindTreeView(root, rows, { onSelect, onToggle })` takes visible depth-first rows with
  `{ node, level, label, selected?, expanded? }`. Start at level 1; omit collapsed descendants.
  Omit `expanded` for leaves. Selection and expansion live in application state. The helper owns
  ARIA attributes, roving focus, arrows, Home/End, typeahead, and Enter/Space selection. Native
  text inputs retain their editing keys. Removing a focused row chooses a surviving row.
- `bindMenu(trigger, menu, items)` uses a native popover for a single-level command menu. Supply
  caller-owned content and command nodes. It handles opening, arrows, Home/End, typeahead,
  disabled commands, Tab, Escape, and outside dismissal. `controller.open(vector2(x, y))` opens
  a context menu at viewport coordinates. Use native buttons or links for commands.
- `bindDialog(frame, { initialFocus? })` requires `createFrame({ TagName: 'dialog', ...props })`.
  Label the native dialog with `aria-label` or `aria-labelledby`. Call `controller.open(trigger)`
  to explicitly restore focus to a pointer-activated opener across browsers. Native modal
  behavior provides top-layer rendering, inert background content, focus containment, and
  nested Escape handling. Call `close()` rather than changing `Visible` to close the modal.

The application still chooses labels, selection policy, and what each command does. Browser
checks do not replace a manual assistive-technology review for the finished application.

### Composed controls

Core instances stay small and close to the engine-style object model. A checkbox, slider, or
tab set is a helper over ordinary buttons and frames, not another instance class. Their parts
retain their `ClassName`, hierarchy, style modifiers, and lifecycle. Supply accessible labels;
use owned watchers to derive appearance from application state.

- `bindCheckbox(button, checked)` accepts an existing TextButton or ImageButton and an
  `ObservableValue<boolean>`. Native button activation toggles that value once. The helper
  reflects `aria-checked` and `button.Disabled`; it does not create a check indicator.
- `bindSlider(track, thumb, { value, min?, max?, step?, orientation? })` accepts a GUI track,
  its directly parented TextButton or ImageButton thumb, and an `ObservableValue<number>`.
  Defaults are 0–100, step 1, and `'Horizontal'`; `'Vertical'` increases upwards. Use an
  unrotated track without a layout modifier controlling the thumb. The binding owns thumb
  `Position` and `AnchorPoint`, centering it on the track edges at the endpoints. Track clicks,
  captured pointer dragging, arrows, Page Up/Down, and Home/End update the value. Dragging
  preserves the grab offset. `thumb.Disabled` blocks interaction and cancels capture.
  Programmatic values must be finite and within the range; user input snaps to steps from
  `min`, with both endpoints reachable. Caller styling and value state remain independent.
- `bindTabs(tablist, items, { selection, orientation? })` accepts fixed `{ key, tab, panel }`
  entries with unique string or number keys and an `ObservableValue` selecting a supplied key.
  Buttons belong inside the tablist; panels belong outside it and must not contain each other
  or the tablist. Arrows on the configured axis wrap past disabled buttons and activate the
  next tab. Home/End choose the first/last enabled tab. Defaults to `'Horizontal'`.
  Programmatic selection switches panels without recreating them; focus in content being
  hidden returns to an enabled tab. Panels are focusable for keyboard entry. Disabled buttons
  cannot be activated by the user; application state may still select their panels. Rebind if
  the set of tabs changes.

Each binding returns an idempotent disposer and releases itself when any supplied part is
destroyed. Disposal restores owned attributes, slider geometry/touch behavior, or original panel
visibility without destroying caller instances or resetting application state. Detaching retains
the binding. Do not reparent managed parts or bind competing behaviors to the same control.
Try the live examples in the project-landing's Controls chapter.

## Large collections

`bindVirtualList(viewport, source, options)` owns a content frame and the viewport's canvas
geometry. Supply a dedicated `ScrollingFrame`, positive `itemHeight`, stable keys,
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

Source changes preserve the first visible key and its pixel offset when possible. If that key is
removed, the next surviving neighbor anchors the viewport. Removing a selected item chooses its
next surviving neighbor, falling back to the previous one. Explicit
disposal destroys generated content, disconnects observation, and restores viewport settings.
For variable-height rows, opt into the measured-height prototype with `itemHeight: { estimate: 48 }`.
The estimate is a positive pixel height used until a row is mounted and measured. The binding owns
row width and position; your factory/update callback owns row height. Wrapped labels can use
`AutomaticSize: 'Y'`, `TextWrapped: true`, and a fixed `TextSize`. Frames can use an automatic
height with an in-flow list layout, or an explicit height that changes when expanded.

```ts
const controller = bindVirtualList(viewport, items, {
  itemHeight: { estimate: 48 },
  key: (item) => item.id,
  selection,
  create: () =>
    createTextLabel({
      AutomaticSize: 'Y',
      TextWrapped: true,
      TextSize: 16,
      TextXAlignment: 'Left',
    }),
  update: (row, item) => {
    row.Text = item.expanded ? item.details : item.label;
  },
});
```

A border-box `ResizeObserver` coalesces measurements into the next animation frame and keeps the first visible key and
pixel offset stable as rows grow, shrink, or wrap. Width changes invalidate cached measurements;
offscreen rows use estimates until mounted again. Heights and offset lookups update in logarithmic
time; source replacement and width invalidation rebuild the index. `scrollToKey` initially uses
estimates for unseen rows, so distant positions and the scrollbar may adjust as measurements arrive.
Use positive row heights, untransformed rows, and height independent of the total canvas height;
scaled text and percentage heights can create circular sizing. Page Up/Down move by the estimated
pixel distance of a viewport. Virtual grids remain outside this contract. Try
`/collections.html?heights=variable` for wrapped and expandable rows.

## Motion and diagnostics

Springs preserve velocity when retargeted. Tweens support timed playback, interruption, and
reversing. Animation claims are per property, so unrelated properties can animate concurrently.
A new claim or direct write takes control of the affected property. For an owned animated
binding, call `spring(node, goal)` from `watchOwnedValue`; there is no second binding ownership
system. Direct manipulation should write directly so it interrupts an animation predictably.

All debugging helpers live in `framekit/devtools`, including `toTreeString(root)` for a text
snapshot and `inspectInstance(node)` for structured data. Tree traversal and property subscriptions
remain core application APIs. Enable the optional development UI:

```ts
// Keep this branch behind your bundler's development constant.
if (import.meta.env.DEV) {
  const { bindRuntimeInspector } = await import('framekit/devtools');
  const debug = bindRuntimeInspector(app, {
    button: true,
    shortcut: { key: 'D', ctrlKey: true, shiftKey: true },
  });
  // Omit shortcut for button-only; use button: false for your own controls.
  // debug.close() exits; debug.dispose() removes the integration.
}
```

`inspectInstance(node)` provides readonly property and hierarchy snapshots, cleanup registration
counts, and animated property names. It can inspect destroyed handles. Counts represent cleanup
registrations, not individual listeners. The UI refreshes every 250 ms and releases its timer when
closed or when the inspected root is destroyed.

`bindRuntimeInspector(root, options?)` is available to every FrameKit application. It supplies a
floating Debug tools launcher and opens the inspector over the running app. Opening and closing
preserve the complete URL, hash, and browser history. Closing releases the inspector's UI
and timer; disposing the binding also removes the launcher and shortcut listener.
The shortcut toggles the inspector, matches modifiers exactly, and ignores repeated, composing,
or already-handled events. Unmodified shortcuts leave text editing alone, except function keys.
Modified shortcuts also work while an inspector search field is focused.

The inspector has a floating window, searchable hierarchy with ancestor paths, selection history,
breadcrumb navigation, grouped property filtering, and readable color/geometry values. Pick
selects an element from the running app without activating its commands. Escape cancels picking;
in a search field it clears the query first, then closes the inspector. Compact screens use
Hierarchy/Details tabs. Drag the title bar to move the window and resize from any edge or corner.
Focus the title bar or resize handles to use Arrow keys; Shift uses smaller steps. Home on the
title bar or a double-click resets the window. Closing restores focus to the opener.
Navigation and styling do not mutate inspected objects.

Each project-landing page binds the same devtools launcher and F8 shortcut during development. The inspector has
no dedicated route or URL entry point. Production project-landing builds remove the integration.
For custom mounting, use `createRuntimeInspector(root)` and mount its `gui` yourself.

`unsafeElement` is useful for native integration, labels, input modes, and unsupported attributes.
Do not mutate FrameKit-owned hierarchy or inline styles through it. Use public geometry,
properties, and lifecycle-aware input operations for normal interaction.

For exact runtime sequencing, read [FRAMEKIT_LIFECYCLE.md](../FRAMEKIT_LIFECYCLE.md). For measured
performance and methodology, read [benchmarks/README.md](../benchmarks/README.md).
