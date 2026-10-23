# FrameKit Workbench

Run `npm run dev:workbench` and open the URL printed by Vite (port 5174 by default).
The landing/documentation app lives separately in `project-landing` and starts with
`npm run dev:landing` or `npm run dev`.

Workbench is an editor built with public FrameKit APIs. The editor chrome and preview are
separate ownership subtrees inside one application. It ships with an editable welcome composition.

## Editing

- Select an object on the canvas or in Explorer. Search retains matching ancestors.
- Use tree arrows, Home/End, typeahead, and Enter/Space. Double-click branches to collapse them.
- Edit properties in the right panel. Enter or blur applies a complete value; Escape restores
  an uncommitted input. Invalid values stay in the field with an error indication and status message.
- Colors use `#RRGGBB`. Position and Size use `x scale, x pixels, y scale, y pixels`.
  AnchorPoint uses `x, y`; one-axis padding uses `scale, pixels`.
- Boolean buttons toggle. Choice buttons cycle through supported values.
- Insert adds an object beneath the selected compatible parent, or beside the selected leaf.
  Modifiers require a scene parent; each parent accepts one modifier of each supported type.
- Duplicate copies a subtree. Delete removes it. Move selects a compatible parent and rejects cycles.
- Undo/redo includes property edits, ownership changes, insertion, deletion, imports, and restoring
  the example. Selection, zoom, and panel sizes do not consume document history.
- Interact lets native buttons and text inputs behave normally. Returning to Design restores
  document values after transient input. Workbench does not attach application behavior to scene buttons.

Drag either divider or focus it and use Left/Right to resize panels. Shift uses one-pixel steps;
Home/End select width limits. Narrow screens use the Explorer, Canvas, and Properties toolbar buttons.
The toolbar scrolls horizontally. Fit shows the whole artboard; 100% enables pixel-scale scrolling.
Choose Canvas to edit its name and dimensions, or use “Edit canvas settings” in Commands.

## Files and shortcuts

Document edits autosave locally in this browser. Panel widths, active compact panel, and zoom
are also restored. If storage is unavailable, editing and explicit downloads still work.
Use Save JSON to keep a portable copy; Open validates an entire JSON file before replacing the
current document. A successful import can be undone. Documents support up to 500 objects, 50
ownership levels, 5 MB of JSON, and artboards between 240 and 4096 pixels on each axis.

Code opens generated TypeScript, with copy and download actions. Supply a normal FrameKit
application and an `#app` mount point to run it. Export includes scene properties and ownership;
editor selection and workspace preferences are excluded. It does not serialize callbacks or resources.

| Shortcut                       | Action                                                            |
| ------------------------------ | ----------------------------------------------------------------- |
| Ctrl/Cmd K                     | Search commands, including New blank document and Restore example |
| Ctrl/Cmd S                     | Save JSON, applying the active property field first               |
| Ctrl/Cmd Z                     | Undo outside text editing                                         |
| Ctrl/Cmd Shift Z or Ctrl/Cmd Y | Redo outside text editing                                         |
| Ctrl/Cmd D                     | Duplicate selection outside text editing                          |
| Delete / Backspace             | Delete selection outside text editing                             |
| F8                             | Runtime inspector in development                                  |

## Source ownership and validation

`schema.ts` defines the supported editing vocabulary and defaults. `document.ts` validates the
JSON boundary and ownership rules. `editor.ts` owns document revisions and selection; `export.ts`
generates source. `preview.ts` reconciles persistent runtime handles by document ID, detaching
surviving moves before destroying removed owners. The remaining modules own workspace geometry,
hierarchy interaction, property editing, commands, file operations, and export UI.

The document is application data rather than a general runtime snapshot format. Add supported
types through the schema and preview factory table, then cover their import and export contracts.

```sh
npm run test:workbench
npm run typecheck
npx playwright test tests/browser/workbench.spec.ts --project=chromium
npm run build:workbench
npm run preview:workbench
```

CI includes Workbench unit tests, its production build, and the existing browser matrix.
Production builds omit the optional runtime inspector. HMR and application destruction release
the editor GUI, native modals, subscriptions, resize observation, file listeners, and download URLs.
