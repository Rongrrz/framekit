import {
  createObservableValue,
  createScreenGui,
  createScrollingFrame,
  createUIFocusRing,
  createUserInputService,
  observeSize,
  setAccessibility,
  udim2,
  udim2FromOffset,
  watchOwnedValue,
  type ScreenGui,
} from 'framekit';

import { createCodeDialog } from './code-dialog';
import { createCommandPalette, type Command } from './commands';
import { descendantIds } from './document';
import { createEditor } from './editor';
import { bindWorkbenchFiles, restoreWorkbench } from './files';
import { createHierarchy } from './hierarchy';
import { createScenePreview } from './preview';
import { createProperties } from './properties';
import { definitionFor, nodeDefinitions, type NodeType } from './schema';
import { button, colors, label, panel, round, stack } from './ui';
import { createWorkspace } from './workspace';

/** Creates a standalone FrameKit application with an explicit, reversible scene document. */
export const createWorkbench = (): ScreenGui => {
  const restored = restoreWorkbench();
  const editor = createEditor(restored.document);
  const preferences = createObservableValue(restored.workspace);
  const interacting = createObservableValue(false);
  const status = createObservableValue(restored.message);
  const app = createScreenGui({ Name: 'FrameKitWorkbench', ColorScheme: 'Dark' });
  createUIFocusRing({ Color: colors.accent, Thickness: 2, Offset: 2 }).Parent = app;
  const report = (message: string): void => status.set(message);
  const perform = (action: () => void): void => {
    try {
      action();
    } catch (error) {
      report(error instanceof Error ? error.message : String(error));
    }
  };

  const background = panel('Workbench background', app, colors.canvas);
  const header = panel('Application header', background);
  header.Size = udim2(1, 0, 0, 52);
  const mark = label(header, 'F', 30, 20, colors.canvas);
  mark.Position = udim2FromOffset(16, 11);
  mark.Size = udim2FromOffset(30, 30);
  mark.BackgroundTransparency = 0;
  mark.BackgroundColor3 = colors.accent;
  mark.TextXAlignment = 'Center';
  mark.FontWeight = 750;
  round(mark, 8);
  const brand = label(header, 'FrameKit', 32, 15);
  brand.Position = udim2FromOffset(56, 10);
  brand.Size = udim2FromOffset(84, 32);
  brand.FontWeight = 650;
  const documentTitle = label(header, '', 32, 12, colors.muted);
  documentTitle.Position = udim2FromOffset(176, 10);
  documentTitle.Size = udim2(1, -440, 0, 32);
  const topActions = panel('File actions', header);
  topActions.Position = udim2(1, -230, 0, 10);
  topActions.Size = udim2FromOffset(214, 32);
  stack(topActions, 6, true);
  const files = bindWorkbenchFiles(app, editor, preferences, report);
  const code = createCodeDialog(app, editor, files.download, report);
  const open = button(topActions, 'Open', files.open, 52);
  open.unsafeElement.title = 'Open a Workbench JSON document';
  button(
    topActions,
    'Save JSON',
    () => files.download(JSON.stringify(editor.state.get().document, null, 2), 'json'),
    88,
  );
  const exportButton = button(topActions, 'Code', () => code.open(exportButton), 62);
  exportButton.BackgroundColor3 = colors.accent;
  exportButton.TextColor3 = colors.canvas;
  const workspace = createWorkspace(app, editor, preferences);
  const preview = createScenePreview(workspace.canvas);
  workspace.canvas.unsafeElement.dataset.workbenchCanvas = '';
  const palette = createCommandPalette(app, perform);

  const insertCommands = (): readonly Command[] =>
    (Object.keys(nodeDefinitions) as NodeType[]).map((type) => ({
      id: `insert:${type}`,
      label: `Add ${type}`,
      hint: definitionFor(type).category,
      run: () => {
        editor.add(type);
        preferences.update((value) => ({ ...value, pane: 'properties' }));
      },
    }));

  const move = (): void => {
    const snapshot = editor.state.get();
    const selected = snapshot.document.nodes.find((node) => node.id === snapshot.selectedId);

    if (!selected) {
      return;
    }

    const excluded = descendantIds(snapshot.document, selected.id);
    const modifier = definitionFor(selected.type).category === 'modifier';
    const candidates = snapshot.document.nodes.filter(
      (node) =>
        !excluded.has(node.id) &&
        (definitionFor(node.type).category === 'container' ||
          (modifier && definitionFor(node.type).category === 'element')),
    );
    const commands: Command[] = candidates.map((node) => ({
      id: node.id,
      label: node.properties.Name,
      hint: node.type,
      run: () => editor.reparent(selected.id, node.id),
    }));

    if (!modifier) {
      commands.unshift({
        id: 'canvas',
        label: 'Canvas (top level)',
        hint: 'Root',
        run: () => editor.reparent(selected.id, null),
      });
    }

    palette.open(`Move ${selected.properties.Name} to…`, commands);
  };

  createHierarchy(workspace.hierarchy, editor);
  createProperties(workspace.properties, editor, move, report, perform);
  const toolbar = panel('Toolbar', background);
  toolbar.Position = udim2FromOffset(0, 53);
  toolbar.Size = udim2(1, 0, 0, 50);
  const toolbarScroll = createScrollingFrame({
    Name: 'Toolbar surface',
    Size: udim2(1, 0, 1, 0),
    BackgroundTransparency: 1,
    ScrollingDirection: 'X',
    AutomaticCanvasSize: 'X',
    ScrollBarThickness: 3,
    ScrollBarImageColor3: colors.border,
  });
  toolbarScroll.Parent = toolbar;
  const controls = panel('Toolbar commands', toolbarScroll);
  controls.Position = udim2FromOffset(12, 8);
  controls.Size = udim2FromOffset(852, 34);
  stack(controls, 6, true);
  const insert = button(
    controls,
    '+ Insert',
    () => palette.open('Insert an object', insertCommands(), insert),
    82,
  );
  insert.BackgroundColor3 = colors.selected;
  insert.TextColor3 = colors.accent;
  const undo = button(controls, '↶', () => perform(editor.undo), 34);
  undo.AccessibleLabel = 'Undo';
  undo.unsafeElement.title = 'Undo · Ctrl/Cmd Z';
  const redo = button(controls, '↷', () => perform(editor.redo), 34);
  redo.AccessibleLabel = 'Redo';
  redo.unsafeElement.title = 'Redo · Ctrl/Cmd Shift Z';
  const paneButtons = (['hierarchy', 'canvas', 'properties'] as const).map((pane) => {
    const name = pane === 'hierarchy' ? 'Explorer' : pane === 'canvas' ? 'Canvas' : 'Properties';
    const control = button(
      controls,
      name,
      () => {
        preferences.update((value) => ({ ...value, pane }));

        if (pane === 'canvas') {
          editor.select(null);
        }
      },
      pane === 'properties' ? 82 : 72,
    );
    return { control, pane };
  });
  const interact = button(controls, '▷ Interact', () => interacting.update((value) => !value), 92);
  const fit = button(
    controls,
    'Fit',
    () => preferences.update((value) => ({ ...value, zoom: 0, pane: 'canvas' })),
    40,
  );
  fit.AccessibleLabel = 'Fit canvas';
  button(
    controls,
    '100%',
    () => preferences.update((value) => ({ ...value, zoom: 1, pane: 'canvas' })),
    50,
  );
  const commands = (): readonly Command[] => [
    ...insertCommands(),
    { id: 'undo', label: 'Undo', hint: 'Ctrl/Cmd Z', run: editor.undo },
    { id: 'redo', label: 'Redo', hint: 'Ctrl/Cmd Shift Z', run: editor.redo },
    { id: 'duplicate', label: 'Duplicate selection', hint: 'Ctrl/Cmd D', run: editor.duplicate },
    { id: 'delete', label: 'Delete selection', hint: 'Delete', run: editor.remove },
    { id: 'move', label: 'Move selection to…', hint: 'Reparent', run: move },
    {
      id: 'canvas',
      label: 'Edit canvas settings',
      hint: 'Name and artboard dimensions',
      run: () => {
        editor.select(null);
        preferences.update((value) => ({ ...value, pane: 'properties' }));
      },
    },
    {
      id: 'save',
      label: 'Save JSON',
      hint: 'Ctrl/Cmd S',
      run: () => files.download(JSON.stringify(editor.state.get().document, null, 2), 'json'),
    },
    { id: 'open', label: 'Open JSON', hint: 'Import document', run: files.open },
    {
      id: 'new',
      label: 'New blank document',
      hint: 'Undo restores the previous document',
      run: () =>
        editor.load(
          JSON.stringify({ version: 1, name: 'Untitled', width: 960, height: 640, nodes: [] }),
        ),
    },
    { id: 'code', label: 'Export TypeScript', hint: 'Source code', run: () => code.open() },
    {
      id: 'reset',
      label: 'Restore example',
      hint: 'Undo restores your current document',
      run: editor.reset,
    },
    {
      id: 'layout',
      label: 'Reset workspace layout',
      hint: 'Panels and zoom',
      run: () => preferences.set({ left: 240, right: 288, zoom: 0, pane: 'canvas' }),
    },
  ];
  const commandButton = button(
    controls,
    'Commands ⌘K',
    () => palette.open('Commands', commands(), commandButton),
    120,
  );
  const footer = panel('Status bar', background);
  footer.Position = udim2(0, 0, 1, -27);
  footer.Size = udim2(1, 0, 0, 27);
  const message = label(footer, '', 26, 10, colors.muted);
  message.Position = udim2FromOffset(16, 0);
  message.Size = udim2(1, -260, 0, 26);
  message.ClipsDescendants = true;
  setAccessibility(message, { role: 'status' });
  watchOwnedValue(app, status, (value) => {
    message.Text = value;
    message.unsafeElement.title = value;
  });

  workspace.viewport.on(
    'pointerdown',
    (event) => {
      if (!interacting.get() && event.button === 0 && preview.idFromTarget(event.target)) {
        event.preventDefault();
        workspace.viewport.focus();
      }
    },
    { capture: true },
  );
  workspace.viewport.on(
    'click',
    (event) => {
      if (!interacting.get()) {
        event.preventDefault();
        event.stopPropagation();
        editor.select(preview.idFromTarget(event.target));
      }
    },
    { capture: true },
  );

  watchOwnedValue(app, editor.state, (snapshot) => {
    preview.update(snapshot.document, interacting.get() ? null : snapshot.selectedId);
    undo.Disabled = !snapshot.canUndo;
    redo.Disabled = !snapshot.canRedo;
    documentTitle.Text = `WORKBENCH  /  ${snapshot.document.name}`;
  });
  watchOwnedValue(app, interacting, (value) => {
    interact.Text = value ? '■ Design' : '▷ Interact';
    interact.AccessibleLabel = interact.Text;
    interact.BackgroundColor3 = value ? colors.selected : colors.raised;
    interact.unsafeElement.setAttribute('aria-pressed', String(value));
    workspace.canvas.unsafeElement.toggleAttribute('data-workbench-editing', !value);
    preview.update(editor.state.get().document, value ? null : editor.state.get().selectedId, true);
    report(
      value
        ? 'Interact mode · Try native controls. Switch to Design to edit.'
        : 'Design mode · Select an object on the canvas or in Explorer.',
    );
  });
  watchOwnedValue(app, preferences, (value) => {
    for (const { control, pane } of paneButtons) {
      control.BackgroundColor3 = value.pane === pane ? colors.selected : colors.raised;
      control.unsafeElement.setAttribute('aria-pressed', String(value.pane === pane));
    }
  });

  const keyboard = createUserInputService(app);
  keyboard.inputBegan.subscribe((event, processed) => {
    const modifier = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (modifier && (key === 'k' || key === 's')) {
      event.preventDefault();
      if (key === 'k') {
        palette.open('Commands', commands(), commandButton);
      } else {
        (document.activeElement as HTMLElement | null)?.blur();
        files.download(JSON.stringify(editor.state.get().document, null, 2), 'json');
      }
      return;
    }

    if (processed || interacting.get()) {
      return;
    }

    if (modifier && (key === 'z' || key === 'y' || key === 'd')) {
      event.preventDefault();
      perform(
        key === 'd' ? editor.duplicate : key === 'y' || event.shiftKey ? editor.redo : editor.undo,
      );
    } else if (!modifier && (event.key === 'Delete' || event.key === 'Backspace')) {
      event.preventDefault();
      perform(editor.remove);
    }
  });

  const resizeHeader = (): void => {
    documentTitle.Visible = window.innerWidth >= 780;
  };
  const stop = observeSize(app, resizeHeader);
  app.onDestroy(stop);
  resizeHeader();
  const previousTitle = document.title;
  document.title = 'Workbench · FrameKit';
  app.onDestroy(() => {
    document.title = previousTitle;
  });
  return app;
};
