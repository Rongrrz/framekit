# FrameKit Workbench

Run `npm run dev:workbench` and open the URL printed by Vite (port 5174 by default).
The landing/documentation app lives separately in `project-landing` and starts with
`npm run dev:landing` or `npm run dev`.

Workbench is an editor built with public FrameKit APIs. The editor chrome and preview are
separate ownership subtrees inside one application. Its project home offers a blank canvas, a welcome
card, a dashboard, and a settings panel as starting points.

## Editing

- Select an object on the canvas or in Explorer. Search retains matching ancestors.
- Use tree arrows, Home/End, typeahead, and Enter/Space. Double-click branches to collapse them.
- Edit properties in the right panel. Enter or blur applies a complete value; Escape restores
  an uncommitted input. Text content supports multiple lines; Ctrl/Cmd Enter applies it. Invalid values stay in the field with an error indication and status message.
- Colors use `#RRGGBB` with an adjacent color swatch. Position and Size have separate X/Y
  scale and pixel fields. Scale is a fraction of the parent axis (0.5 means half).
  AnchorPoint has X/Y fields; padding has scale and pixel fields.
- Properties are grouped by purpose. Boolean buttons toggle; dropdown menus list supported choices.
- Insert adds an object beneath the selected compatible parent, or beside the selected leaf.
  Modifiers require a scene parent; each parent accepts one modifier of each supported type.
- Drag a branch onto the middle of a row to reparent it, or onto its upper/lower edge to reorder
  siblings. Drop on Canvas to move to the root. Hover expands collapsed branches and edges scroll
  the tree; Escape cancels. Cycles, incompatible owners, and duplicate modifiers are rejected.
- Right-click a row or open Explorer actions to rename, cut, copy, paste, duplicate, change visibility,
  move, delete, expand, or collapse. F2 renames inline; Alt Up/Down reorders siblings. Cut moves the
  original branch when pasted; copy and duplicate assign fresh IDs to the entire branch.
- Undo/redo includes property edits, ownership changes, insertion, deletion, and clipboard operations. Opening a project starts its own history session. Selection, zoom, and panel sizes do not consume document history.
- Preview lets native buttons and text inputs behave normally. Returning to Design restores
  document values after transient input. Workbench does not attach application behavior to scene buttons.

Drag either divider or focus it and use Left/Right to resize panels. Shift uses one-pixel steps;
Home/End select width limits. Narrow screens have a fixed Explorer/Canvas/Properties switcher
at the bottom. The toolbar scrolls horizontally. Fit shows the whole artboard; 100% enables pixel-scale scrolling.
Choose Canvas in the inspector to edit its name and dimensions, or use “Edit canvas settings” in Commands.

## Files and shortcuts

Projects autosave independently in this browser. Projects returns to the library, where you can
search, sort, reopen, rename, duplicate, and delete saved projects. Deletion asks for confirmation.
New project offers four templates. Reloading a project's URL reopens it; browser Back/Forward
navigates between projects and home. The previous single autosaved document is migrated into the
library without removing its original saved data.

Save and Ctrl/Cmd S save the current project; export is TypeScript code only. Workspace preferences
and code themes persist separately. If browser storage fails, editing remains available in memory
and the save status explains the failure; keep the tab open and export code to preserve the scene.
Projects support up to 500 objects, 50 ownership levels, and artboards between 240 and 4096 pixels
on each axis. Browser storage is local to this origin and browser profile.

Code opens formatted, syntax-highlighted TypeScript with line numbers and GitHub Dark, GitHub Light,
and Catppuccin themes. Theme selection persists. Export uses readable object names and compact
FrameKit value constructors. Copy and download use the same formatted source shown in the preview.
Formatting and highlighting load on demand in an owned background worker. Supply a normal FrameKit
application and an `#app` mount point to run it. Export includes scene properties and ownership;
editor selection and workspace preferences are excluded. It does not serialize callbacks or resources.

| Shortcut                       | Action                                                     |
| ------------------------------ | ---------------------------------------------------------- |
| Ctrl/Cmd K                     | Search commands, including project library and templates   |
| Ctrl/Cmd S                     | Save the project, applying the active property field first |
| Ctrl/Cmd Z                     | Undo outside text editing                                  |
| Ctrl/Cmd Shift Z or Ctrl/Cmd Y | Redo outside text editing                                  |
| Ctrl/Cmd D                     | Duplicate selection outside text editing                   |
| Ctrl/Cmd C / X / V             | Copy / cut / paste branches outside text editing           |
| F2                             | Rename the selected object                                 |
| Alt Up / Down                  | Reorder the selected sibling                               |
| Delete / Backspace             | Delete selection outside text editing                      |
| F8                             | Runtime inspector in development                           |

## Source ownership and validation

`schema.ts` defines the supported editing vocabulary and defaults. `document.ts` validates the
JSON boundary and ownership rules. `editor.ts` owns document revisions and selection; `export.ts`
generates source. `preview.ts` reconciles persistent runtime handles by document ID, detaching
surviving moves before destroying removed owners. The remaining modules own workspace geometry,
hierarchy interaction, validated branch moves, project storage and templates, property editing,
commands, downloads, and export UI.

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
the editor GUI, native modals, subscriptions, resize observation, drag animation frames, and download URLs.
