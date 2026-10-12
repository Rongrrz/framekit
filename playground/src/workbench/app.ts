import {
  bindDialog,
  bindKeyedChildren,
  bindMenu,
  bindTreeView,
  color3FromHex,
  createComputedValue,
  createFrame,
  createLink,
  createObservableValue,
  createScreenGui,
  createScrollingFrame,
  createTextButton,
  createTextInput,
  createUIListLayout,
  udim2,
  udim2FromOffset,
  vector2,
  watchOwnedValue,
  type ScreenGui,
  type TreeViewItem,
} from 'framekit';

import {
  bindDocumentTheme,
  bindThemeColors,
  bindThemeTransition,
  fonts,
  resolveInitialTheme,
  themes,
  type ThemeValue,
} from '../theme';
import { createButton, createSurface, createText } from '../ui';
import { createWorkbenchModel, visibleObjects, type WorkbenchModel } from './model';
import { bindPreview } from './preview';
import { createPropertyEditor } from './property-editor';

/** A bounded editor that exercises FrameKit ownership, state, ordering, input, and motion. */
export const createWorkbench = (model: WorkbenchModel = createWorkbenchModel()): ScreenGui => {
  const app = createScreenGui({ Name: 'Workbench' });
  const mode = createObservableValue(resolveInitialTheme());
  const theme: ThemeValue = createObservableValue(themes[mode.get()]);
  bindDocumentTheme(app, mode);
  bindThemeTransition(app, mode, theme);
  const background = createFrame(
    { Name: 'Workspace', Size: udim2(1, 0, 1, 0) },
    { tagName: 'main' },
  );
  bindThemeColors(background, theme, (palette) => ({ BackgroundColor3: palette.canvas }));
  background.Parent = app;
  const header = createFrame(
    { Name: 'Toolbar', Size: udim2(1, 0, 0, 68), BackgroundTransparency: 1 },
    { tagName: 'header' },
  );
  header.Parent = background;
  createText(theme, {
    text: 'FrameKit / Workbench',
    size: udim2FromOffset(280, 28),
    position: udim2FromOffset(20, 20),
    textSize: 18,
    weight: 800,
  }).Parent = header;
  const toolbar = createScrollingFrame({
    Size: udim2FromOffset(704, 40),
    ScrollingDirection: 'X',
    AutomaticCanvasSize: 'X',
    ScrollBarThickness: 0,
    Position: udim2(1, -20, 0, 14),
    AnchorPoint: vector2(1, 0),
    BackgroundTransparency: 1,
  });
  createUIListLayout({ FillDirection: 'Horizontal' }).Parent = toolbar;
  toolbar.Parent = header;
  const command = (label: string, action: () => void): ReturnType<typeof createButton> => {
    const button = createButton(theme, {
      label,
      size: udim2FromOffset(88, 38),
      position: udim2FromOffset(0, 0),
      textSize: 12,
    });
    button.onClick(action);
    button.Parent = toolbar;
    return button;
  };
  command('Add card', () => model.add());
  command('Add group', () => model.add('group'));
  const undo = command('Undo', model.undo);
  const redo = command('Redo', model.redo);
  const actions = command('Actions', () => undefined);
  command('Theme', () => mode.set(mode.get() === 'dark' ? 'light' : 'dark'));
  const docs = createLink({
    Text: 'Docs ↗',
    Href: './index.html',
    Size: udim2FromOffset(88, 38),
    BackgroundTransparency: 1,
    TextSize: 12,
    TextColor3: theme.get().text,
  });
  docs.Parent = toolbar;
  bindThemeColors(docs, theme, (palette) => ({ TextColor3: palette.text }));
  const sidebar = createSurface(theme, { name: 'ObjectsPanel', radius: 14 });
  sidebar.Parent = background;
  const stage = createSurface(theme, { name: 'PreviewPanel', radius: 14, clipsDescendants: true });
  stage.Parent = background;
  const propertyEditor = createSurface(theme, { name: 'PropertyEditorPanel', radius: 14 });
  propertyEditor.Parent = background;
  createPropertyEditor(propertyEditor, model, theme);
  const compactProperties = createFrame(
    {
      Name: 'CompactProperties',
      Size: udim2FromOffset(340, 600),
      Position: udim2(0.5, -170, 0.5, -300),
      BackgroundTransparency: 1,
    },
    { tagName: 'dialog' },
  );
  compactProperties.unsafeElement.setAttribute('aria-label', 'Properties');
  compactProperties.Parent = app;
  const propertyDialog = bindDialog(compactProperties);
  const properties = command('Properties', () => propertyDialog.open(properties));
  const closeProperties = createButton(theme, {
    label: 'Close',
    size: udim2FromOffset(60, 32),
    position: udim2(1, -76, 0, 14),
    textSize: 12,
  });
  closeProperties.ZIndex = 10;
  closeProperties.Parent = compactProperties;
  closeProperties.onClick(() => propertyDialog.close());
  createText(theme, {
    text: 'Objects',
    size: udim2FromOffset(180, 28),
    position: udim2FromOffset(16, 16),
    textSize: 18,
    weight: 800,
  }).Parent = sidebar;
  const search = createTextInput({
    Name: 'ObjectSearch',
    AccessibleLabel: 'Search objects',
    InputType: 'Search',
    PlaceholderText: 'Search objects…',
    Size: udim2(1, -32, 0, 36),
    Position: udim2FromOffset(16, 56),
    TextSize: 13,
    FontFamily: fonts.sans,
  });
  bindThemeColors(search, theme, (palette) => ({
    BackgroundColor3: palette.surfaceRaised,
    TextColor3: palette.text,
    PlaceholderColor3: palette.textMuted,
  }));
  search.Parent = sidebar;
  const query = createObservableValue('');
  search.onTextChanged((text) => query.set(text));
  const collapsed = createObservableValue<ReadonlySet<string>>(new Set());
  const tree = createScrollingFrame({
    Name: 'ObjectTree',
    Position: udim2FromOffset(12, 108),
    Size: udim2(1, -24, 1, -124),
    ScrollingDirection: 'Y',
    AutomaticCanvasSize: 'Y',
    BackgroundTransparency: 1,
    ScrollBarImageColor3: theme.get().textMuted,
  });
  tree.unsafeElement.setAttribute('aria-label', 'Objects');
  tree.Parent = sidebar;
  createUIListLayout().Parent = tree;
  const visible = createComputedValue([model.state, query, collapsed, theme], () =>
    visibleObjects(model.state.get().objects, query.get(), collapsed.get()),
  );
  const rows = new Map<string, ReturnType<typeof createTextButton>>();
  bindKeyedChildren(tree, visible, {
    key: ({ object }) => object.id,
    create: ({ object }) => {
      const row = createTextButton({
        Name: `Object:${object.id}`,
        BackgroundTransparency: 1,
        TextXAlignment: 'Left',
        TextSize: 13,
        FontFamily: fonts.sans,
      });
      rows.set(object.id, row);
      row.onDestroy(() => rows.delete(object.id));
      row.on('dblclick', () => {
        if (object.kind === 'group') {
          toggle(object.id, collapsed.get().has(object.id));
        }
      });
      return row;
    },
    update: (row, { object, level }) => {
      row.setProperties({
        Text: `${'    '.repeat(level - 1)}${object.kind === 'group' ? (collapsed.get().has(object.id) ? '▸ ' : '▾ ') : '  '}${object.name}`,
        Size: udim2(1, 0, 0, 34),
        TextColor3: theme.get().text,
        BackgroundColor3: theme.get().accentMuted,
        BackgroundTransparency: object.id === model.state.get().selectedId ? 0 : 1,
      });
      row.unsafeElement.setAttribute('aria-label', object.name);
    },
  });
  const toggle = (id: string, expanded: boolean): void => {
    const next = new Set(collapsed.get());
    if (expanded) {
      next.delete(id);
    } else {
      next.add(id);
    }
    collapsed.set(next);
  };
  const treeItems = createComputedValue([visible], (): readonly TreeViewItem[] =>
    visible.get().map(({ object, level }) => ({
      node: rows.get(object.id)!,
      level,
      label: object.name,
      selected: object.id === model.state.get().selectedId,
      ...(object.kind === 'group'
        ? { expanded: query.get() !== '' || !collapsed.get().has(object.id) }
        : {}),
    })),
  );
  bindTreeView(tree, treeItems, {
    onSelect: (node) => {
      const id = [...rows].find(([, row]) => row === node)?.[0];
      if (id) {
        model.select(id);
      }
    },
    onToggle: (node, expanded) => {
      const id = [...rows].find(([, row]) => row === node)?.[0];
      if (id) {
        toggle(id, expanded);
      }
    },
  });
  createText(theme, {
    text: 'Live preview',
    size: udim2FromOffset(160, 28),
    position: udim2FromOffset(20, 16),
    textSize: 18,
    weight: 800,
  }).Parent = stage;
  createText(theme, {
    text: 'Select a card. Drag to move it.',
    size: udim2FromOffset(260, 24),
    position: udim2FromOffset(20, 46),
    textSize: 12,
    color: 'textMuted',
  }).Parent = stage;
  const canvas = createFrame({
    Name: 'DesignCanvas',
    BackgroundColor3: color3FromHex('#171e27'),
    Position: udim2(0.5, 0, 0.5, 24),
    AnchorPoint: vector2(0.5, 0.5),
    ClipsDescendants: true,
  });
  canvas.Parent = stage;
  const zoom = createObservableValue(1);
  const animate = bindPreview(canvas, model, zoom, theme);
  const menu = createSurface(theme, {
    name: 'ObjectActions',
    size: udim2FromOffset(180, 160),
    radius: 10,
  });
  menu.Parent = app;
  createUIListLayout().Parent = menu;
  const menuCommands = [
    ['Move up', () => model.move(-1)],
    ['Move down', () => model.move(1)],
    ['Animate', animate],
    ['Delete', model.remove],
  ] as const;
  const menuItems = menuCommands.map(([label, action]) => {
    const button = createButton(theme, {
      label,
      size: udim2FromOffset(180, 40),
      position: udim2FromOffset(0, 0),
      textSize: 13,
    });
    button.onClick(action);
    button.Parent = menu;
    return button;
  });
  const context = bindMenu(actions, menu, menuItems);
  tree.on('contextmenu', (event) => {
    event.preventDefault();
    const match = [...rows].find(([, row]) => row.unsafeElement.contains(event.target as Node));
    if (match) {
      model.select(match[0]);
      context.open(vector2(event.clientX, event.clientY));
    }
  });
  tree.on('keydown', (event) => {
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      context.open();
    }
  });
  const status = createText(theme, {
    text: '',
    size: udim2(1, -40, 0, 24),
    position: udim2(0, 20, 1, -28),
    color: 'textMuted',
    textSize: 12,
  });
  status.unsafeElement.setAttribute('role', 'status');
  status.Parent = background;
  watchOwnedValue(app, model.state, (state) => {
    undo.Disabled = !state.canUndo;
    redo.Disabled = !state.canRedo;
    const selected = state.objects.find((object) => object.id === state.selectedId)!;
    status.Text = `${state.objects.length} objects · ${selected.name} selected · ⌘/Ctrl Z undo · Shift ⌘/Ctrl Z redo · ? shortcuts`;
    menuItems[3]!.Disabled = selected.parentId === undefined;
  });
  const about = createFrame(
    {
      Name: 'WorkbenchHelp',
      Size: udim2FromOffset(360, 180),
      Position: udim2(0.5, -180, 0.5, -90),
      BackgroundColor3: theme.get().surface,
    },
    { tagName: 'dialog' },
  );
  about.unsafeElement.setAttribute('aria-label', 'Workbench shortcuts');
  about.Parent = app;
  createText(theme, {
    text: 'Keyboard shortcuts\n\nArrows navigate the object tree.\nEnter selects. Delete removes an object.\n⌘/Ctrl Z undoes. Escape closes overlays.',
    size: udim2FromOffset(328, 140),
    position: udim2FromOffset(16, 16),
    textSize: 14,
    wrapped: true,
  }).Parent = about;
  const help = bindDialog(about);
  status.on('dblclick', () => help.open());
  app.on('keydown', (event) => {
    const target = event.target as HTMLElement;
    if (
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
      target.isContentEditable ||
      event.defaultPrevented
    ) {
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        model.redo();
      } else {
        model.undo();
      }
    } else if (event.ctrlKey && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      model.redo();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      model.remove();
    } else if (event.key === '?') {
      event.preventDefault();
      help.open();
    }
  });
  const sidebarWidth = createObservableValue(240);
  const divider = createFrame({ Name: 'PanelDivider', BackgroundTransparency: 1 });
  divider.unsafeElement.setAttribute('role', 'separator');
  divider.unsafeElement.setAttribute('aria-label', 'Resize objects panel');
  divider.unsafeElement.setAttribute('aria-orientation', 'vertical');
  divider.unsafeElement.tabIndex = 0;
  divider.unsafeElement.style.cursor = 'col-resize';
  divider.unsafeElement.style.touchAction = 'none';
  divider.Parent = background;
  let resizing: number | undefined;
  divider.on('pointerdown', (event) => {
    if (event.button === 0) {
      resizing = event.pointerId;
      divider.setPointerCapture(event.pointerId);
      event.preventDefault();
    }
  });
  divider.on('pointermove', (event) => {
    if (resizing === event.pointerId) {
      sidebarWidth.set(Math.min(360, Math.max(180, event.clientX - 16)));
    }
  });
  divider.on('pointerup', (event) => {
    if (resizing === event.pointerId) {
      resizing = undefined;
      divider.releasePointerCapture(event.pointerId);
    }
  });
  divider.on('pointercancel', () => {
    resizing = undefined;
  });
  divider.on('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      sidebarWidth.set(
        Math.min(360, Math.max(180, sidebarWidth.get() + (event.key === 'ArrowRight' ? 16 : -16))),
      );
    }
  });
  const layout = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const compact = width < 1100;
    properties.Visible = compact;
    const left = compact ? Math.min(220, Math.round(width * 0.32)) : sidebarWidth.get();
    const right = compact ? 0 : 248;
    const center = Math.max(160, width - left - right - 56);
    sidebar.setProperties({
      Position: udim2FromOffset(16, 76),
      Size: udim2FromOffset(left, height - 112),
    });
    stage.setProperties({
      Position: udim2FromOffset(left + 28, 76),
      Size: udim2FromOffset(center, height - 112),
    });
    if (!compact) {
      propertyDialog.close();
    }
    propertyEditor.Parent = compact ? compactProperties : background;
    const dialogWidth = Math.min(340, width - 32);
    compactProperties.setProperties({
      Size: udim2FromOffset(dialogWidth, Math.min(600, height - 32)),
      Position: udim2(0.5, -dialogWidth / 2, 0.5, -Math.min(600, height - 32) / 2),
    });
    propertyEditor.setProperties({
      Position: compact ? udim2FromOffset(0, 0) : udim2FromOffset(width - right - 16, 76),
      Size: compact
        ? udim2FromOffset(dialogWidth, Math.min(600, height - 32))
        : udim2FromOffset(right, height - 112),
      Visible: true,
    });
    divider.setProperties({
      Position: udim2FromOffset(left + 16, 76),
      Size: udim2FromOffset(12, height - 112),
      Visible: !compact,
    });
    divider.unsafeElement.setAttribute('aria-valuenow', String(left));
    divider.unsafeElement.setAttribute('aria-valuemin', '180');
    divider.unsafeElement.setAttribute('aria-valuemax', '360');
    const scale = Math.max(0.1, Math.min(1, (center - 32) / 800, (height - 240) / 600));
    zoom.set(scale);
    canvas.Size = udim2FromOffset(800 * scale, 600 * scale);
    toolbar.Size = compact ? udim2(1, -32, 0, 40) : udim2FromOffset(704, 40);
    toolbar.Position = compact ? udim2FromOffset(16, 56) : udim2(1, -20, 0, 14);
    toolbar.AnchorPoint = vector2(compact ? 0 : 1, 0);
    if (compact) {
      sidebar.Position = udim2FromOffset(16, 108);
      stage.Position = udim2FromOffset(left + 28, 108);
      sidebar.Size = udim2FromOffset(left, height - 144);
      stage.Size = udim2FromOffset(center, height - 144);
    }
  };
  watchOwnedValue(app, sidebarWidth, layout);
  const controller = new AbortController();
  window.addEventListener('resize', layout, { signal: controller.signal });
  app.onDestroy(() => controller.abort());
  return app;
};
