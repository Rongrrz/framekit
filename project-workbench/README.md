# FrameKit Workbench

Run `npm run dev:workbench` and open the URL printed by Vite (port 5174 by default).
The landing/documentation app lives separately in `project-landing` and starts with
`npm run dev:landing` or `npm run dev`.

Workbench is an editor built with public FrameKit APIs. The editor chrome and preview are
separate ownership subtrees inside one application. Its project home offers a blank canvas, a welcome
card, a dashboard, a settings panel, and interactive counters as starting points.

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
  document values after transient input. Event connections run only in Preview.

Drag either divider or focus it and use Left/Right to resize panels. Shift uses one-pixel steps;
Home/End select width limits. Narrow screens have a fixed Explorer/Canvas/Properties switcher
at the bottom. The toolbar scrolls horizontally. Fit shows the whole artboard; 100% enables pixel-scale scrolling.
Choose Canvas in the inspector to edit its name and dimensions, or use “Edit canvas settings” in Commands.

## Files and shortcuts

Projects autosave independently in this browser. Projects returns to the library, where you can
search, sort, reopen, rename, duplicate, and delete saved projects. Deletion asks for confirmation.
New project offers five templates. Reloading a project's URL reopens it; browser Back/Forward
navigates between projects and home. The previous single autosaved document is migrated into the
library without removing its original saved data.

Save and Ctrl/Cmd S save the complete project, including its prefabs and connections. Workspace
preferences and code themes persist separately. If browser storage fails, editing remains available
in memory and the save status explains the failure. Browser storage is local to this origin and profile.

## Prefabs and events

Hierarchy contains the objects and prefab instances placed in the active scene. The Prefabs tab
contains reusable component definitions. Select a standard GUI branch and choose **Create prefab**
to convert its frames, text, controls, and modifiers into a component. With nothing selected, this
creates an empty component instead.

Choose **Edit** in the prefab library or **Edit prefab** on a selected instance to open its own
hierarchy and canvas. Use the Canvas inspector to rename the component or change its preview
size. **Return to scene** leaves the prefab editor. **Insert** places a linked instance in the
current scene or component; prefabs may contain other prefabs. Changes to a definition update
its instances. Root properties edited on an instance override that definition for that instance.
Undo includes definition edits, event connections, and insertion.

**Events** opens the connection editor for the current scene or prefab. Declare custom outputs,
then connect a button's Activated, a text input's TextChanged/Submitted, or a nested prefab's
custom output to an action. Actions set or toggle a property, increment text, copy text, or emit
a custom output. Connections can be edited or deleted. Internal objects and events belong to
each placed instance. The Welcome card uses a reusable button with a Pressed output; Interactive
counters demonstrates independent state and outputs passing through nested prefabs.

A scene or definition supports 500 authored objects and 50 ownership levels. Projects support
100 definitions, 20 nested prefab levels, and 5,000 expanded scene objects (2,000 per definition).
Scene dimensions range from 240 to 4096 pixels; prefab editing canvases can be as small as 4 pixels.

## Settings and device previews

The gear button opens settings from either the editor or project home. Canvas grid, snapping,
and alignment guides have independent switches. Drag objects directly on the design canvas;
nearby edges and centers snap before the eight-pixel grid. Hold Alt to move freely, or Escape
to cancel a drag. A completed drag creates one undo step. Layout-controlled children are arranged
through Hierarchy.

The device selector previews desktop, laptop, tablet, phone, wide-screen, or custom dimensions;
rotate switches orientation. Settings accepts custom widths and heights between 240 and 4096 pixels.
These previews change the viewport without rewriting saved design dimensions. Scale-based
properties respond to the preview size; fixed pixel values retain their authored sizes.
Prefab editing uses the component's own dimensions.

Settings also controls zoom, code appearance, panel widths, and resetting the panel layout.
These choices persist in this browser.

## Code and export

**Code** opens a file hierarchy with scene and prefab TypeScript modules, index.html, CSS,
package.json, TypeScript configuration, and a README. Files are formatted and syntax highlighted
with line numbers in GitHub Dark, GitHub Light, or Catppuccin. Copy and individual downloads use
the same formatted source shown in the viewer; ZIP export includes those same file contents.
Formatting and highlighting load on demand in an owned background worker.

**Download ZIP** exports a complete code project, including a local FrameKit source dependency.
Unzip it, run `npm install`, then `npm run dev`. Use `npm run build` for production. No published
FrameKit package is required. Generated factories expose a root, named nodes, custom output
subscriptions, and destroy(); each prefab is a separate module. The app fills the browser viewport,
matching device previews. Export is code rather than a saved project JSON document; selection,
workspace preferences, and undo history are excluded.

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
saved document boundary, ownership, prefab dependencies, and event references. `editor.ts` owns
project revisions and selection; `prefabs.ts` derives the active editing scope. `project-export.ts`
generates component factories and project files; `zip.ts` packages them. `preview.ts` reconciles persistent runtime handles by document ID, detaching
surviving moves before destroying removed owners. The remaining modules own workspace geometry,
hierarchy interaction, validated branch moves, project storage and templates, property editing,
commands, downloads, and export UI.

The document is application data rather than a general runtime snapshot format. Add supported
types through the schema and preview factory table, then cover their import and export contracts.

```sh
npm run test:workbench
npm run typecheck
npx playwright test tests/browser/workbench.spec.ts tests/browser/workbench-prefabs.spec.ts --project=chromium
npm run build:workbench
npm run preview:workbench
```

CI includes Workbench unit tests, its production build, and the existing browser matrix.
Production builds omit the optional runtime inspector. HMR and application destruction release
the editor GUI, native modals, subscriptions, resize observation, drag animation frames, and download URLs.
