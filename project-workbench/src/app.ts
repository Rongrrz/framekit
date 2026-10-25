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

import { bindCanvasDrag } from './canvas-drag';
import { createCanvasPreferences, deviceDocument } from './canvas-preferences';
import { bindChromeTheme, themeChromeNode } from './chrome-theme';
import { createCodeDialog } from './code-dialog';
import { createCommandPalette, type Command } from './commands';
import { descendantIds, type SceneDocument } from './document';
import { createDropdown } from './dropdown';
import { createEditor } from './editor';
import { createEventDialog } from './event-dialog';
import { bindWorkbenchFiles, restoreWorkspace } from './files';
import { createHierarchy } from './hierarchy';
import { setIcon } from './icons/ai-decorations';
import { nodeIcons } from './icons/ai-node-icons';
import { createPrefabLibrary } from './prefab-library';
import { createPresentation } from './presentation';
import { createScenePreview } from './preview';
import { createProjectHome } from './project-home';
import { createProjectLibrary } from './projects';
import { createProperties } from './properties';
import { createResolutionControls } from './resolution-controls';
import { definitionFor, nodeDefinitions, type NodeType } from './schema';
import { createScriptDialog } from './script-dialog';
import { createSettingsDialog } from './settings-dialog';
import { button, colors, iconButton, label, panel, round, stack } from './ui';
import { canvasZoomChoices, createWorkspace, defaultWorkspace, formatCanvasZoom } from './workspace';

/** Creates a standalone FrameKit application with an explicit, reversible scene document. */
export const createWorkbench = (): ScreenGui => {
  const library = createProjectLibrary();
  const editor = createEditor();
  const preferences = createObservableValue(restoreWorkspace());
  let activeProjectId: string | null = null;
  const status = createObservableValue('Select an object to start editing.');
  const app = createScreenGui({ Name: 'FrameKitWorkbench', ColorScheme: 'Dark' });
  const canvasPreferences = createCanvasPreferences(app);
  bindChromeTheme(app, canvasPreferences);
  themeChromeNode(createUIFocusRing({ Color: colors.accent, Thickness: 2, Offset: 2 })).Parent =
    app;
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
  header.unsafeElement.dataset.workbenchDivider = 'bottom';
  const mark = label(header, 'F', 30, 20, colors.canvas);
  mark.Position = udim2FromOffset(16, 11);
  mark.Size = udim2FromOffset(30, 30);
  mark.BackgroundTransparency = 0;
  mark.BackgroundColor3 = colors.accent;
  mark.TextXAlignment = 'Center';
  mark.FontWeight = 750;
  round(mark, 8);
  const brand = label(header, 'Workbench', 32, 15);
  brand.Position = udim2FromOffset(56, 10);
  brand.Size = udim2FromOffset(100, 32);
  brand.FontWeight = 650;
  const documentTitle = label(header, '', 32, 12, colors.muted);
  documentTitle.Position = udim2FromOffset(176, 10);
  documentTitle.Size = udim2(1, -440, 0, 32);
  documentTitle.ClipsDescendants = true;
  const topActions = panel('File actions', header);
  topActions.Position = udim2(1, -290, 0, 10);
  topActions.Size = udim2FromOffset(274, 32);
  const files = bindWorkbenchFiles(app, preferences, report);
  const code = createCodeDialog(app, editor, files.download, report);
  const scripts = createScriptDialog(app, editor, code.getTheme);
  const save = (): void => {
    (document.activeElement as HTMLElement | null)?.blur();

    if (activeProjectId) {
      library.save(activeProjectId, editor.state.get().project);
      report(library.error.get() ?? 'Saved in this browser.');
    }
  };
  const showHome = (): void => {
    cancelCanvasDrag();
    window.location.hash = '/';
    renderRoute();
  };
  const projectsButton = button(topActions, 'Projects', showHome, 88);
  projectsButton.AccessibleLabel = 'Back to projects';
  setIcon(projectsButton, 'arrow_left');
  const saveButton = iconButton(topActions, 'save', 'Save', () => perform(save));
  saveButton.unsafeElement.title = 'Save project · Ctrl/⌘ S';
  const exportButton = button(topActions, 'Export', () => code.open(exportButton), 96);
  setIcon(exportButton, 'download');
  const workspace = createWorkspace(background, editor, preferences, canvasPreferences);
  const settings = createSettingsDialog(
    app,
    preferences,
    canvasPreferences,
    code,
    () => editor.state.get().document,
  );
  watchOwnedValue(app, canvasPreferences, (value) =>
    workspace.viewport.unsafeElement.toggleAttribute('data-workbench-grid', value.grid),
  );
  const settingsButton = iconButton(topActions, 'settings', 'Settings', () =>
    settings.open(settingsButton),
  );
  const preview = createScenePreview(workspace.canvas, report);
  const presentation = createPresentation(app, canvasPreferences, report, () => settings.open());
  const present = button(
    topActions,
    'Present',
    () => {
      cancelCanvasDrag();
      (document.activeElement as HTMLElement | null)?.blur();
      presentation.open(editor.state.get().document, present);
    },
    104,
  );
  present.BackgroundColor3 = colors.accent;
  present.TextColor3 = colors.canvas;
  setIcon(present, 'play');
  workspace.canvas.unsafeElement.dataset.workbenchCanvas = '';
  const palette = createCommandPalette(app, perform);

  const insertCommands = (): readonly Command[] =>
    (Object.keys(nodeDefinitions) as NodeType[]).map((type) => ({
      id: `insert:${type}`,
      label: `Add ${type}`,
      hint: definitionFor(type).category,
      icon: nodeIcons[type],
      run: () => {
        editor.add(type);
        if (type === 'Script') {
          scripts.open(editor.state.get().selectedId!);
        }
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
    const script = selected.type === 'Script';
    const candidates = snapshot.document.nodes.filter(
      (node) =>
        !excluded.has(node.id) &&
        (definitionFor(node.type).category === 'container' ||
          ((modifier || script) && definitionFor(node.type).category === 'element')),
    );
    const commands: Command[] = candidates.map((node) => ({
      id: node.id,
      label: node.properties.Name,
      hint: node.type,
      icon: node.prefabId ? 'prefab' : nodeIcons[node.type],
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

  const leftSection = createObservableValue<'hierarchy' | 'prefabs'>('hierarchy');
  const leftTabs = panel('Object libraries', workspace.hierarchy);
  leftTabs.Size = udim2(1, 0, 0, 38);
  const hierarchyTab = button(leftTabs, 'Hierarchy', () => leftSection.set('hierarchy'), 100);
  setIcon(hierarchyTab, 'layers');
  hierarchyTab.AccessibleLabel = 'Hierarchy tab';
  hierarchyTab.Position = udim2FromOffset(8, 4);
  hierarchyTab.Size = udim2(0.5, -12, 0, 30);
  const prefabTab = button(leftTabs, 'Prefabs', () => leftSection.set('prefabs'), 100);
  setIcon(prefabTab, 'prefab');
  prefabTab.AccessibleLabel = 'Prefabs tab';
  prefabTab.Position = udim2(0.5, 4, 0, 4);
  prefabTab.Size = udim2(0.5, -12, 0, 30);
  const hierarchyView = panel('Hierarchy editor', workspace.hierarchy);
  hierarchyView.Position = udim2FromOffset(0, 38);
  hierarchyView.Size = udim2(1, 0, 1, -38);
  const openPrefab = (id: string | null): void => {
    editor.openPrefab(id);
    leftSection.set('hierarchy');
    preferences.update((value) => ({ ...value, pane: 'canvas' }));
  };
  const prefabView = createPrefabLibrary(workspace.hierarchy, editor, openPrefab, perform);
  prefabView.Position = udim2FromOffset(0, 38);
  prefabView.Size = udim2(1, 0, 1, -38);
  watchOwnedValue(app, leftSection, (section) => {
    hierarchyView.Visible = section === 'hierarchy';
    prefabView.Visible = section === 'prefabs';
    hierarchyTab.BackgroundColor3 = section === 'hierarchy' ? colors.raised : colors.panel;
    prefabTab.BackgroundColor3 = section === 'prefabs' ? colors.raised : colors.panel;
    hierarchyTab.TextColor3 = section === 'hierarchy' ? colors.text : colors.muted;
    prefabTab.TextColor3 = section === 'prefabs' ? colors.text : colors.muted;
    hierarchyTab.unsafeElement.setAttribute('aria-pressed', String(section === 'hierarchy'));
    prefabTab.unsafeElement.setAttribute('aria-pressed', String(section === 'prefabs'));
  });
  createHierarchy(
    hierarchyView,
    editor,
    () => palette.open('Insert an object', insertCommands()),
    move,
    perform,
    report,
    (id, opener) => scripts.open(id, opener),
  );
  const events = createEventDialog(
    app,
    editor,
    (title, commands, opener) => palette.open(title, commands, opener),
    perform,
  );
  createProperties(workspace.properties, editor, report, () => {
    const id = editor.state.get().selectedId;
    if (id) {
      scripts.open(id);
    }
  });
  const toolbar = panel('Toolbar', background);
  toolbar.unsafeElement.dataset.workbenchDivider = 'bottom';
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
  controls.Size = udim2FromOffset(0, 34);
  controls.AutomaticSize = 'X';
  stack(controls, 6, true);
  const insert = button(
    controls,
    '+ Insert',
    () => palette.open('Insert an object', insertCommands(), insert),
    92,
  );
  insert.BackgroundColor3 = colors.selected;
  insert.TextColor3 = colors.accent;
  insert.Text = 'Insert';
  setIcon(insert, 'plus');
  const undo = iconButton(controls, 'undo', 'Undo', () => perform(editor.undo));
  undo.unsafeElement.title = 'Undo · Ctrl/Cmd Z';
  const redo = iconButton(controls, 'redo', 'Redo', () => perform(editor.redo));
  redo.unsafeElement.title = 'Redo · Ctrl/Cmd Shift Z';
  const navigation = panel('Workspace panels', background);
  navigation.Position = udim2(0, 0, 1, -76);
  navigation.Size = udim2(1, 0, 0, 48);
  const paneButtons = (['hierarchy', 'canvas', 'properties'] as const).map((pane, index) => {
    const name = pane === 'hierarchy' ? 'Explorer' : pane === 'canvas' ? 'Canvas' : 'Properties';
    const control = button(
      navigation,
      name,
      () => {
        preferences.update((value) => ({ ...value, pane }));

        if (pane === 'canvas') {
          editor.select(null);
        }
      },
      pane === 'properties' ? 82 : 72,
    );
    control.Position = udim2(index / 3, 6, 0, 7);
    control.Size = udim2(1 / 3, -12, 0, 34);
    return { control, pane };
  });
  const zoom = createDropdown(controls, {
    label: 'Canvas zoom',
    width: 108,
    menuParent: app,
    choices: canvasZoomChoices,
    formatValue: formatCanvasZoom,
    value: () => preferences.get().zoom,
    change: (value) =>
      preferences.update((current) => ({ ...current, zoom: value, pane: 'canvas' })),
  });
  watchOwnedValue(app, preferences, zoom.refresh);
  const commands = (): readonly Command[] => [
    ...insertCommands(),
    { id: 'undo', label: 'Undo', hint: 'Ctrl/Cmd Z', run: editor.undo },
    { id: 'redo', label: 'Redo', hint: 'Ctrl/Cmd Shift Z', run: editor.redo },
    { id: 'duplicate', label: 'Duplicate selection', hint: 'Ctrl/Cmd D', run: editor.duplicate },
    { id: 'copy', label: 'Copy selection', hint: 'Ctrl/Cmd C', run: () => editor.copy() },
    { id: 'cut', label: 'Cut selection', hint: 'Ctrl/Cmd X', run: () => editor.copy(true) },
    { id: 'paste', label: 'Paste into selection', hint: 'Ctrl/Cmd V', run: editor.paste },
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
      id: 'settings',
      label: 'Workbench settings',
      hint: 'Canvas, panels, and code appearance',
      run: () => settings.open(),
    },
    {
      id: 'events',
      label: 'Edit event connections',
      hint: 'Triggers, actions, and custom outputs',
      run: () => events.open(),
    },
    {
      id: 'prefabs',
      label: 'Open prefab library',
      hint: 'Reusable components',
      run: () => {
        leftSection.set('prefabs');
        preferences.update((value) => ({ ...value, pane: 'hierarchy' }));
      },
    },
    {
      id: 'scene',
      label: 'Return to scene hierarchy',
      hint: 'Leave prefab editing',
      run: () => openPrefab(null),
    },
    { id: 'save', label: 'Save project', hint: 'Ctrl/Cmd S · browser storage', run: save },
    { id: 'open', label: 'Open project', hint: 'Your project library', run: showHome },
    {
      id: 'new',
      label: 'New project from template',
      hint: 'Choose a starting point',
      run: showHome,
    },
    { id: 'code', label: 'Export TypeScript', hint: 'Source code', run: () => code.open() },
    {
      id: 'layout',
      label: 'Reset workspace layout',
      hint: 'Panels and zoom',
      run: () => preferences.set(defaultWorkspace),
    },
  ];
  const commandButton = iconButton(
    controls,
    'command',
    'Commands',
    () => palette.open('Commands', commands(), commandButton),
    32,
  );
  commandButton.unsafeElement.title = 'Commands · Ctrl/⌘ K';
  const eventsButton = button(controls, 'Events', () => events.open(eventsButton), 92);
  setIcon(eventsButton, 'events');
  const sceneButton = button(controls, 'Scene', () => openPrefab(null), 92);
  setIcon(sceneButton, 'arrow_left');
  sceneButton.AccessibleLabel = 'Return to scene';
  const editPrefabButton = button(
    controls,
    'Edit prefab',
    () => {
      const snapshot = editor.state.get();
      const prefabId = snapshot.document.nodes.find(
        (node) => node.id === snapshot.selectedId,
      )?.prefabId;

      if (prefabId) {
        perform(() => openPrefab(prefabId));
      }
    },
    124,
  );
  setIcon(editPrefabButton, 'prefab');
  const devices = createResolutionControls(controls, {
    preferences: canvasPreferences,
    document: () => editor.state.get().document,
    label: 'Canvas resolution',
    orientationLabel: 'Canvas orientation',
    menuParent: app,
    custom: () => settings.open(),
  });
  const viewportDivider = panel('Viewport tools divider', controls, colors.border);
  viewportDivider.Size = udim2FromOffset(1, 20);
  const actionDivider = panel('Editor tools divider', controls, colors.border);
  actionDivider.Size = udim2FromOffset(1, 20);
  const layout = controls.getChildren().find((node) => node.isA('UIListLayout'))!;
  controls.reorderChildren([
    insert,
    undo,
    redo,
    viewportDivider,
    devices.resolution,
    devices.orientation,
    zoom.control,
    actionDivider,
    eventsButton,
    commandButton,
    sceneButton,
    editPrefabButton,
    layout,
  ]);
  topActions.reorderChildren([projectsButton, saveButton, exportButton, present, settingsButton]);
  watchOwnedValue(app, canvasPreferences, (value) => {
    const snapshot = editor.state.get();
    preview.update(
      deviceDocument(snapshot.document, value, snapshot.prefabId),
      snapshot.selectedId,
    );
    devices.resolution.Disabled = Boolean(snapshot.prefabId);
    devices.orientation.Disabled ||= Boolean(snapshot.prefabId);
  });
  const footer = panel('Status bar', background);
  footer.Position = udim2(0, 0, 1, -27);
  footer.Size = udim2(1, 0, 0, 27);
  workspace.zoomLabel.Parent = footer;
  const message = label(footer, '', 26, 10, colors.muted);
  message.Position = udim2FromOffset(16, 0);
  message.Size = udim2(1, -260, 0, 26);
  message.ClipsDescendants = true;
  setAccessibility(message, { role: 'status' });
  watchOwnedValue(app, status, (value) => {
    message.Text = value;
    message.unsafeElement.title = value;
  });

  const cancelCanvasDrag = bindCanvasDrag(
    workspace.viewport,
    workspace.canvas,
    editor,
    canvasPreferences,
    preview,
    report,
  );

  watchOwnedValue(app, editor.state, (snapshot) => {
    preview.update(
      deviceDocument(snapshot.document, canvasPreferences.get(), snapshot.prefabId),
      snapshot.selectedId,
    );
    undo.Disabled = !snapshot.canUndo;
    redo.Disabled = !snapshot.canRedo;
    documentTitle.Text = `${snapshot.project.name}${snapshot.prefabId ? ` / ${snapshot.document.name}` : ''}`;
    documentTitle.unsafeElement.title = documentTitle.Text;
    sceneButton.Disabled = !snapshot.prefabId;
    devices.refresh();
    devices.resolution.Disabled = Boolean(snapshot.prefabId);
    devices.orientation.Disabled ||= Boolean(snapshot.prefabId);
    sceneButton.Visible = Boolean(snapshot.prefabId);
    editPrefabButton.Disabled = !snapshot.document.nodes.find(
      (node) => node.id === snapshot.selectedId,
    )?.prefabId;
    editPrefabButton.Visible = !editPrefabButton.Disabled;
  });
  workspace.canvas.unsafeElement.setAttribute('data-workbench-editing', '');
  watchOwnedValue(app, preferences, (value) => {
    for (const { control, pane } of paneButtons) {
      control.BackgroundColor3 = value.pane === pane ? colors.selected : colors.raised;
      control.unsafeElement.setAttribute('aria-pressed', String(value.pane === pane));
    }
  });

  const keyboard = createUserInputService(app);
  keyboard.inputBegan.subscribe((event, processed) => {
    if (
      !activeProjectId ||
      app.unsafeElement.querySelector('dialog[open], [popover]:popover-open')
    ) {
      return;
    }

    const modifier = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (modifier && (key === 'k' || key === 's')) {
      event.preventDefault();
      if (key === 'k') {
        palette.open('Commands', commands(), commandButton);
      } else {
        perform(save);
      }
      return;
    }

    if (processed) {
      return;
    }

    if (modifier && (key === 'c' || key === 'x' || key === 'v')) {
      event.preventDefault();
      perform(() => {
        if (key === 'v') {
          editor.paste();
        } else {
          editor.copy(key === 'x');
          report(
            key === 'x'
              ? 'Cut branch. Select a destination and paste to move it.'
              : 'Copied branch. Select a destination and paste.',
          );
        }
      });
    } else if (modifier && (key === 'z' || key === 'y' || key === 'd')) {
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
    const compact = window.innerWidth < 780;
    brand.Visible = window.innerWidth >= 1100;
    const widths = [compact ? 32 : 88, 32, compact ? 32 : 96, compact ? 32 : 104, 32];
    const actions = [projectsButton, saveButton, exportButton, present, settingsButton];
    let x = 0;
    actions.forEach((control, index) => {
      control.Position = udim2FromOffset(x, 0);
      control.Size = udim2FromOffset(widths[index]!, 32);
      x += widths[index]! + 6;
    });
    topActions.Size = udim2FromOffset(x - 6, 32);
    topActions.Position = udim2(1, -x - 10, 0, 10);
    for (const [control, icon, text] of [
      [projectsButton, 'arrow_left', 'Projects'],
      [exportButton, 'download', 'Export'],
      [present, 'play', 'Present'],
    ] as const) {
      control.Text = compact ? '' : text;
      setIcon(control, icon, compact ? 'only' : 'leading');
      control.unsafeElement.title = control.AccessibleLabel;
    }
    const titleX = brand.Visible ? 176 : 56;
    documentTitle.Position = udim2FromOffset(titleX, 10);
    documentTitle.Size = udim2(1, -x - titleX - 24, 0, 32);
    navigation.Visible = window.innerWidth < 1060;
  };
  const stop = observeSize(app, resizeHeader);
  app.onDestroy(stop);
  resizeHeader();
  const previousTitle = document.title;
  const openProject = (id: string): void => {
    window.location.hash = `/project/${encodeURIComponent(id)}`;
    renderRoute();
  };
  const createProject = (document: SceneDocument): void => {
    const project = library.create(document);
    openProject(project.id);
  };
  const home = createProjectHome(app, library, openProject, createProject, perform, () =>
    settings.open(),
  );

  const renderRoute = (): void => {
    const route = window.location.hash.match(/^#\/project\/([^/]+)$/);
    const project = route
      ? library.state.get().find((entry) => encodeURIComponent(entry.id) === route[1])
      : undefined;

    if (project) {
      home.close();
    }

    if (project && project.id !== activeProjectId) {
      activeProjectId = project.id;
      leftSection.set('hierarchy');
      editor.replace(project.document);
      report(
        library.error.get() ??
          'Saved in this browser. Drag objects in Explorer to organize your interface.',
      );
    } else if (!project) {
      activeProjectId = null;
    }

    if (!project) {
      cancelCanvasDrag();
      code.close();
      palette.close();
      events.close();
      settings.close();
      presentation.close();
      scripts.close();
    }

    background.Visible = Boolean(project);
    home.view.Visible = !project;
    document.title = project ? `${project.document.name} · FrameKit` : 'Your projects · FrameKit';
  };

  let previous = editor.state.get().project;
  watchOwnedValue(app, editor.state, (snapshot) => {
    if (!activeProjectId || snapshot.project === previous) {
      previous = snapshot.project;
      return;
    }

    previous = snapshot.project;
    if (
      library.state.get().find((project) => project.id === activeProjectId)?.document ===
      snapshot.project
    ) {
      return;
    }

    library.save(activeProjectId, snapshot.project);
    document.title = `${snapshot.project.name} · FrameKit`;
    report(library.error.get() ?? 'Saved automatically in this browser.');
  });
  const controller = new AbortController();
  window.addEventListener('hashchange', renderRoute, { signal: controller.signal });
  app.onDestroy(() => {
    controller.abort();
    document.title = previousTitle;
  });
  renderRoute();
  return app;
};
