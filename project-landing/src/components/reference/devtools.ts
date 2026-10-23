import chooseHowToOpenItExample from '../../../examples/devtools/choose-how-to-open-it.ts?example';
import readSnapshotsInCodeExample from '../../../examples/devtools/read-snapshots-in-code.ts?example';
import shortcutOnlyOrCustomControlsExample from '../../../examples/devtools/shortcut-only-or-custom-controls.ts?example';
import type { ReferenceChapter } from './chapter';

export const devtoolsChapter = {
  title: 'Runtime inspector',
  summary:
    'Inspect the running tree without changing its URL or ownership. Devtools live in the optional framekit/devtools entry point.',
  sections: [
    {
      title: 'Choose how to open it',
      body: 'bindRuntimeInspector(root, options?) shows a Debug tools button by default and creates the inspector only when opened. Set button to false for a shortcut or your own UI; add shortcut to enable both. The returned binding always exposes open, close, and dispose.',
      code: chooseHowToOpenItExample,
      note: 'Shortcuts toggle the inspector. Modifiers match exactly; omitted ctrlKey, metaKey, altKey, and shiftKey mean false. Use metaKey for a Command shortcut. Browser and OS reserved shortcuts may not reach the page.',
    },
    {
      title: 'Shortcut-only or custom controls',
      body: 'With button: false, no launcher is mounted. Unmodified shortcuts are ignored inside inputs, textareas, selects, and editable content, except function keys (F1–F24). Ctrl, Command, and Alt shortcuts also work while an inspector search field has focus. Repeated, composing, or already-handled key events are ignored.',
      code: shortcutOnlyOrCustomControlsExample,
      note: 'Omit shortcut for button-only use. Set button: false and omit shortcut to use only your own controls. dispose removes the launcher, shortcut listener, and open inspector. Destroying the inspected root does the same.',
    },
    {
      title: 'Find what matters',
      body: 'Search the hierarchy by name or class, including collapsed descendants. Select a row to see grouped properties, child count, owned cleanup registrations, and animated properties. Breadcrumbs move to ancestors; back and forward retrace selections.',
      note: 'Pick selects an application element without activating its command. Escape exits picking. Property values are selectable and expose their complete value on hover. The inspector is read only and refreshes every 250ms; cleanup registrations are not a browser-listener count.',
    },
    {
      title: 'Arrange your workspace',
      body: 'Drag the title bar to move the inspector. Resize from any edge or corner. Focus the title bar and use Arrow keys to move; focus a resize handle and use Arrow keys to resize. Shift uses a smaller step. Home on the title bar, or a double-click, resets the window.',
      note: 'The window stays inside the viewport. A narrower window switches to Hierarchy and Details tabs; Left/Right, Home, and End navigate the tabs. Inside the inspector, / focuses hierarchy search. Escape clears an active search before closing; closing restores focus to the opener.',
    },
    {
      title: 'Read snapshots in code',
      body: 'inspectInstance returns a readonly snapshot with properties, parent, children, animation claims, and cleanup registrations. toTreeString prints the logical hierarchy, including modifiers. createRuntimeInspector creates an independent inspector when you need to manage mounting yourself.',
      code: readSnapshotsInCodeExample,
      note: 'Devtools use the inspected root’s document and stay outside its ownership tree. Keep the integration behind your bundler’s development flag; the Playground removes it from production builds.',
    },
  ],
} as const satisfies ReferenceChapter;
