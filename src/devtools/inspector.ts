import type { Frame } from '#elements/frame.js';
import { createScreenGui, type ScreenGui } from '#elements/screen-gui.js';
import type { TextButton } from '#elements/text.js';
import { isTextEntry } from '#helpers/composite-keyboard.js';
import { bindKeyedChildren } from '#helpers/keyed-children.js';
import { bindTreeView, type TreeViewItem } from '#helpers/tree-view.js';
import type { Instance } from '#internal/runtime/node/instance.js';
import { isGuiNode } from '#internal/runtime/node/registry.js';
import { createUICorner } from '#modifiers/corner.js';
import { createUIListLayout } from '#modifiers/list-layout.js';
import { createObservableValue } from '#state/value.js';
import { color3FromHex } from '#values/color3.js';
import { udim, udim2, udim2FromOffset } from '#values/udim.js';

import { formatValue, projectHierarchy, propertyGroup, type HierarchyRow } from './model.js';
import { inspectInstance, inspectionDocument } from './snapshot.js';
import { colors, createDebugUI, installInspectorStyles } from './view.js';

/** An independently mounted inspector. Destroying gui stops observation and picking. */
export type RuntimeInspector = Readonly<{
  gui: ScreenGui;
  select(node: Instance): void;
  refresh(): void;
}>;

let inspectorId = 0;

/** A read-only developer workspace that never becomes part of the inspected ownership tree. */
export const createRuntimeInspector = (root: Instance): RuntimeInspector => {
  if (root.isDestroyed()) {
    throw new Error('Cannot inspect a destroyed root.');
  }
  const document = inspectionDocument(root);
  const window = document.defaultView!;
  const gui = createScreenGui(
    { Name: 'FrameKitRuntimeInspector', DisplayOrder: 10000 },
    { ownerDocument: document },
  );
  gui.unsafeElement.style.pointerEvents = 'none';
  gui.unsafeElement.dataset.fkDebug = '';
  installInspectorStyles(gui);
  inspectorId += 1;
  const id = `fk-inspector-${inspectorId}`;
  const ui = createDebugUI(document);
  const panel = ui.frame(gui, {
    Name: 'InspectorPanel',
    BackgroundTransparency: 0,
    BackgroundColor3: colors.paper,
  });
  panel.unsafeElement.style.pointerEvents = 'auto';
  panel.unsafeElement.dataset.fkDebugPanel = '';
  panel.unsafeElement.setAttribute('role', 'complementary');
  panel.unsafeElement.setAttribute('aria-label', 'FrameKit runtime inspector');
  createUICorner({ CornerRadius: 14 }).Parent = panel;
  const header = ui.frame(panel, { Size: udim2(1, 0, 0, 64) });
  const mark = ui.label(header, 'fk', {
    Position: udim2FromOffset(20, 16),
    Size: udim2FromOffset(32, 32),
    FontWeight: 800,
    TextSize: 21,
    TextColor3: colors.accent,
  });
  mark.unsafeElement.setAttribute('aria-hidden', 'true');
  ui.label(header, 'FrameKit', {
    Position: udim2FromOffset(60, 12),
    Size: udim2FromOffset(116, 24),
    TextSize: 15,
    FontWeight: 700,
  });
  ui.label(header, 'RUNTIME INSPECTOR', {
    Position: udim2FromOffset(60, 34),
    Size: udim2FromOffset(146, 16),
    TextSize: 9,
    FontWeight: 600,
    TextColor3: colors.muted,
  });
  const pick = ui.button(header, '⌖  Pick', {
    AccessibleLabel: 'Pick an element',
    Position: udim2(1, -148, 0, 16),
    Size: udim2FromOffset(84, 32),
  });
  const close = ui.button(header, '×', {
    AccessibleLabel: 'Close runtime inspector',
    Position: udim2(1, -52, 0, 16),
    TextSize: 20,
    BackgroundTransparency: 1,
  });
  close.onClick(() => gui.destroy());
  const line = (parent: Frame, Position: Frame['Position'], Size: Frame['Size']): void => {
    ui.frame(parent, { Position, Size, BackgroundTransparency: 0, BackgroundColor3: colors.line });
  };
  line(panel, udim2FromOffset(0, 64), udim2(1, 0, 0, 1));
  const tabs = ui.frame(panel, { Position: udim2FromOffset(12, 72), Size: udim2(1, -24, 0, 34) });
  tabs.unsafeElement.setAttribute('role', 'tablist');
  tabs.unsafeElement.setAttribute('aria-label', 'Inspector panels');
  const hierarchyTab = ui.button(tabs, 'Hierarchy', { Size: udim2(0.5, -4, 1, 0) });
  const detailsTab = ui.button(tabs, 'Details', {
    Position: udim2(0.5, 4, 0, 0),
    Size: udim2(0.5, -4, 1, 0),
  });
  const hierarchyPanel = ui.frame(panel, { Name: 'HierarchyPanel' });
  const detailPanel = ui.frame(panel, { Name: 'DetailsPanel' });
  for (const [node, tab, name] of [
    [hierarchyPanel, hierarchyTab, 'hierarchy'],
    [detailPanel, detailsTab, 'details'],
  ] as const) {
    node.unsafeElement.id = `${id}-${name}`;
    tab.unsafeElement.id = `${id}-${name}-tab`;
    tab.unsafeElement.setAttribute('aria-controls', node.unsafeElement.id);
    node.unsafeElement.setAttribute('aria-labelledby', tab.unsafeElement.id);
  }
  const divider = ui.frame(panel, { BackgroundTransparency: 0, BackgroundColor3: colors.line });
  ui.label(hierarchyPanel, 'Hierarchy', {
    Position: udim2FromOffset(16, 12),
    Size: udim2FromOffset(116, 24),
    FontWeight: 650,
    TextSize: 13,
  });
  const expand = ui.button(hierarchyPanel, '+', {
    AccessibleLabel: 'Expand all nodes',
    Position: udim2(1, -76, 0, 9),
    Size: udim2FromOffset(26, 26),
    BackgroundTransparency: 1,
    TextSize: 18,
  });
  const collapse = ui.button(hierarchyPanel, '−', {
    AccessibleLabel: 'Collapse all nodes',
    Position: udim2(1, -44, 0, 9),
    Size: udim2FromOffset(26, 26),
    BackgroundTransparency: 1,
    TextSize: 18,
  });
  const search = ui.input(hierarchyPanel, 'Search runtime hierarchy', 'Search name or class…');
  search.Position = udim2FromOffset(12, 46);
  const tree = ui.scroll(hierarchyPanel, 'Runtime hierarchy');
  tree.setProperties({ Position: udim2FromOffset(8, 94), Size: udim2(1, -16, 1, -126) });
  createUIListLayout({ Padding: udim(0, 2) }).Parent = tree;
  const treeEmpty = ui.label(hierarchyPanel, 'No matching instances', {
    Position: udim2FromOffset(16, 106),
    Size: udim2(1, -32, 0, 32),
    TextColor3: colors.muted,
  });
  const treeCount = ui.label(hierarchyPanel, '', {
    Position: udim2(0, 16, 1, -28),
    Size: udim2(1, -32, 0, 22),
    TextSize: 10,
    TextColor3: colors.muted,
  });
  const nav = ui.frame(detailPanel, {
    Position: udim2FromOffset(16, 10),
    Size: udim2(1, -32, 0, 28),
  });
  const back = ui.button(nav, '←', {
    AccessibleLabel: 'Previous inspected instance',
    Size: udim2FromOffset(26, 26),
    BackgroundTransparency: 1,
  });
  const forward = ui.button(nav, '→', {
    AccessibleLabel: 'Next inspected instance',
    Position: udim2FromOffset(30, 0),
    Size: udim2FromOffset(26, 26),
    BackgroundTransparency: 1,
  });
  const breadcrumbs = ui.frame(nav, {
    Position: udim2FromOffset(64, 0),
    Size: udim2(1, -64, 1, 0),
    ClipsDescendants: true,
  });
  breadcrumbs.unsafeElement.setAttribute('role', 'navigation');
  breadcrumbs.unsafeElement.setAttribute('aria-label', 'Instance ancestors');
  createUIListLayout({ FillDirection: 'Horizontal', Padding: udim(0, 4) }).Parent = breadcrumbs;
  const selectedName = ui.label(detailPanel, '', {
    Position: udim2FromOffset(20, 46),
    Size: udim2(1, -40, 0, 32),
    TextSize: 23,
    FontWeight: 700,
  });
  const selectedClass = ui.label(detailPanel, '', {
    Position: udim2FromOffset(20, 80),
    Size: udim2(1, -40, 0, 22),
    TextSize: 11,
    TextColor3: colors.accent,
    FontFamily: 'ui-monospace, monospace',
  });
  const metrics = ui.frame(detailPanel, {
    Position: udim2FromOffset(16, 118),
    Size: udim2(1, -32, 0, 60),
  });
  const metricValues = ['Children', 'Owned cleanups', 'Animating'].map((name, index) => {
    const box = ui.frame(metrics, {
      Position: udim2(index / 3, index === 0 ? 0 : 4, 0, 0),
      Size: udim2(1 / 3, -4, 1, 0),
      BackgroundTransparency: 0,
      BackgroundColor3: colors.canvas,
    });
    createUICorner({ CornerRadius: 8 }).Parent = box;
    ui.label(box, name, {
      Position: udim2FromOffset(10, 7),
      Size: udim2(1, -20, 0, 18),
      TextSize: 9,
      TextColor3: colors.muted,
    });
    return ui.label(box, '0', {
      Position: udim2FromOffset(10, 28),
      Size: udim2(1, -20, 0, 24),
      TextSize: 17,
      FontWeight: 650,
    });
  });
  metrics.unsafeElement.title =
    'Owned cleanups counts registrations, not individual browser listeners.';
  const propertySearch = ui.input(detailPanel, 'Filter runtime properties', 'Filter properties…');
  propertySearch.setProperties({ Position: udim2FromOffset(16, 194), Size: udim2(1, -32, 0, 34) });
  const details = ui.scroll(detailPanel, 'Runtime properties');
  details.setProperties({ Position: udim2FromOffset(16, 240), Size: udim2(1, -32, 1, -252) });
  createUIListLayout().Parent = details;
  const propertyEmpty = ui.label(detailPanel, 'No matching properties', {
    Position: udim2FromOffset(20, 252),
    Size: udim2(1, -40, 0, 30),
    TextColor3: colors.muted,
  });
  const footer = ui.label(panel, '●  Live   ·   Read only', {
    Position: udim2(0, 20, 1, -32),
    Size: udim2(1, -40, 0, 24),
    TextSize: 10,
    TextColor3: colors.muted,
  });
  line(panel, udim2(0, 0, 1, -38), udim2(1, 0, 0, 1));
  const resize = ui.frame(panel, {
    Name: 'ResizeInspector',
    Position: udim2FromOffset(-5, 16),
    Size: udim2(0, 10, 1, -32),
  });
  resize.unsafeElement.setAttribute('role', 'separator');
  resize.unsafeElement.setAttribute('aria-label', 'Resize runtime inspector');
  resize.unsafeElement.setAttribute('aria-orientation', 'vertical');
  resize.unsafeElement.tabIndex = 0;
  resize.unsafeElement.style.cursor = 'ew-resize';
  const highlight = ui.frame(gui, { Name: 'PickedElement', Visible: false, ZIndex: 2 });
  highlight.unsafeElement.style.border = '2px solid #248961';
  highlight.unsafeElement.style.boxShadow = '0 0 0 3px #24896125';
  const highlightLabel = ui.label(highlight, '', {
    Position: udim2FromOffset(-2, -26),
    Size: udim2FromOffset(240, 24),
    BackgroundTransparency: 0,
    BackgroundColor3: colors.accent,
    TextColor3: colors.paper,
    TextSize: 11,
  });

  let selected = root;
  let history: Instance[] = [root];
  let historyIndex = 0;
  let width = 680;
  let compactPanel: 'hierarchy' | 'details' = 'hierarchy';
  let picking = false;
  let drag: Readonly<{ id: number; x: number; width: number }> | undefined;
  const collapsed = new Set(
    projectHierarchy(root, new Set(), '')
      .filter((row) => row.level >= 3 && row.snapshot.children.length > 0)
      .map((row) => row.node),
  );
  const ids = new WeakMap<Instance, number>();
  let nextId = 0;
  const key = (node: Instance): number => {
    const existing = ids.get(node);
    if (existing !== undefined) {
      return existing;
    }
    nextId += 1;
    ids.set(node, nextId);
    return nextId;
  };
  const layout = (): void => {
    const smallScreen = window.innerWidth < 640;
    const margin = smallScreen ? 8 : 16;
    const panelWidth = smallScreen
      ? window.innerWidth - 16
      : Math.min(width, window.innerWidth - 32);
    const compact = smallScreen || panelWidth < 600;
    panel.setProperties({
      Position: udim2(1, -panelWidth - margin, 0, margin),
      Size: udim2(0, panelWidth, 1, -margin * 2),
    });
    tabs.Visible = compact;
    hierarchyPanel.unsafeElement.setAttribute('role', compact ? 'tabpanel' : 'region');
    detailPanel.unsafeElement.setAttribute('role', compact ? 'tabpanel' : 'region');
    const top = compact ? 116 : 65;
    const leftWidth = compact ? panelWidth : Math.max(224, Math.round(panelWidth * 0.42));
    hierarchyPanel.setProperties({
      Position: udim2FromOffset(0, top),
      Size: udim2(0, leftWidth, 1, -top - 38),
      Visible: !compact || compactPanel === 'hierarchy',
    });
    detailPanel.setProperties({
      Position: udim2FromOffset(compact ? 0 : leftWidth + 1, top),
      Size: udim2(1, compact ? 0 : -leftWidth - 1, 1, -top - 38),
      Visible: !compact || compactPanel === 'details',
    });
    divider.setProperties({
      Position: udim2FromOffset(leftWidth, top),
      Size: udim2(0, 1, 1, -top - 38),
      Visible: !compact,
    });
    resize.Visible = !smallScreen;
    resize.unsafeElement.setAttribute('aria-valuemin', '420');
    resize.unsafeElement.setAttribute('aria-valuemax', String(window.innerWidth - 32));
    resize.unsafeElement.setAttribute('aria-valuenow', String(panelWidth));
    for (const [tab, name] of [
      [hierarchyTab, 'hierarchy'],
      [detailsTab, 'details'],
    ] as const) {
      tab.unsafeElement.setAttribute('role', 'tab');
      tab.unsafeElement.setAttribute('aria-selected', String(compactPanel === name));
      tab.unsafeElement.tabIndex = compactPanel === name ? 0 : -1;
      tab.BackgroundColor3 = compactPanel === name ? colors.selected : colors.canvas;
    }
  };
  hierarchyTab.onClick(() => {
    compactPanel = 'hierarchy';
    layout();
  });
  detailsTab.onClick(() => {
    compactPanel = 'details';
    layout();
  });
  tabs.on('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    compactPanel =
      event.key === 'Home'
        ? 'hierarchy'
        : event.key === 'End'
          ? 'details'
          : compactPanel === 'hierarchy'
            ? 'details'
            : 'hierarchy';
    layout();
    (compactPanel === 'hierarchy' ? hierarchyTab : detailsTab).focus();
  });
  const setWidth = (next: number): void => {
    width = Math.max(420, Math.min(next, window.innerWidth - 32));
    layout();
  };
  resize.on('pointerdown', (event) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    resize.focus();
    resize.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX, width: panel.Size.X.Offset };
  });
  resize.on('pointermove', (event) => {
    if (drag?.id === event.pointerId) {
      setWidth(drag.width + drag.x - event.clientX);
    }
  });
  resize.on('pointerup', (event) => {
    if (drag?.id === event.pointerId) {
      drag = undefined;
      resize.releasePointerCapture(event.pointerId);
    }
  });
  resize.on('pointercancel', () => {
    drag = undefined;
  });
  resize.on('lostpointercapture', () => {
    drag = undefined;
  });
  resize.on('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    setWidth(
      event.key === 'Home'
        ? 420
        : event.key === 'End'
          ? window.innerWidth - 32
          : width + (event.key === 'ArrowLeft' ? 24 : -24),
    );
  });

  const hierarchy = createObservableValue<readonly HierarchyRow[]>([]);
  const treeRows = createObservableValue<readonly TreeViewItem[]>([]);
  const rows = new Map<
    Instance,
    Readonly<{
      frame: Frame;
      name: ReturnType<typeof ui.label>;
      badge: ReturnType<typeof ui.label>;
      toggle: TextButton;
    }>
  >();
  bindKeyedChildren(tree, hierarchy, {
    key: (row) => key(row.node),
    create: (row) => {
      const frame = ui.frame(undefined, {
        Name: `Runtime:${key(row.node)}`,
        Size: udim2(1, -4, 0, 32),
        BackgroundColor3: colors.selected,
      });
      createUICorner({ CornerRadius: 6 }).Parent = frame;
      const toggle = ui.button(frame, '', {
        Size: udim2FromOffset(22, 28),
        BackgroundTransparency: 1,
        TextSize: 15,
      });
      toggle.unsafeElement.tabIndex = -1;
      toggle.on('click', (event) => {
        event.stopPropagation();
        if (search.Text.trim()) {
          return;
        }
        if (collapsed.has(row.node)) {
          collapsed.delete(row.node);
        } else {
          collapsed.add(row.node);
        }
        refresh();
        rows.get(row.node)?.frame.focus();
      });
      const name = ui.label(frame, '', { Size: udim2(1, -102, 1, 0), TextSize: 12 });
      const badge = ui.label(frame, '', {
        Position: udim2(1, -76, 0, 0),
        Size: udim2FromOffset(70, 32),
        TextSize: 9,
        TextColor3: colors.muted,
        TextXAlignment: 'Right',
      });
      rows.set(row.node, { frame, name, badge, toggle });
      frame.onDestroy(() => rows.delete(row.node));
      return frame;
    },
    update: (frame, row) => {
      const view = rows.get(row.node)!;
      const inset = 4 + (row.level - 1) * 14;
      frame.BackgroundTransparency = row.node === selected ? 0 : 1;
      frame.unsafeElement.setAttribute(
        'aria-label',
        `${row.node.Name} (${row.snapshot.className})`,
      );
      view.toggle.setProperties({
        Text: search.Text.trim() || !collapsed.has(row.node) ? '⌄' : '›',
        Visible: row.snapshot.children.length > 0,
        Disabled: Boolean(search.Text.trim()),
        Position: udim2FromOffset(inset, 2),
        AccessibleLabel: `${collapsed.has(row.node) ? 'Expand' : 'Collapse'} ${row.node.Name}`,
      });
      view.name.setProperties({
        Text: row.node.Name,
        Position: udim2FromOffset(inset + 24, 0),
        Size: udim2(1, -inset - 106, 1, 0),
        FontWeight: row.node === selected ? 650 : 450,
      });
      view.name.unsafeElement.title = row.node.Name;
      view.badge.Text = row.snapshot.className.replace(/^UI/, '');
    },
  });
  const ancestors = createObservableValue<readonly Instance[]>([]);
  bindKeyedChildren(breadcrumbs, ancestors, {
    key,
    create: (node) => {
      const button = ui.button(undefined, '', {
        BackgroundTransparency: 1,
        TextColor3: colors.muted,
        TextSize: 10,
      });
      button.onClick(() => select(node));
      return button;
    },
    update: (button, node) =>
      button.setProperties({
        Text: `${node.Name} ›`,
        AccessibleLabel: `Inspect ancestor ${node.Name}`,
        Size: udim2FromOffset(Math.min(132, node.Name.length * 6 + 18), 26),
      }),
  });
  type PropertyRow = Readonly<{
    key: string;
    name: string;
    value?: unknown;
    heading: boolean;
    animated: boolean;
  }>;
  const properties = createObservableValue<readonly PropertyRow[]>([]);
  const propertyViews = new Map<
    Frame,
    Readonly<{
      name: ReturnType<typeof ui.label>;
      value: ReturnType<typeof ui.label>;
      swatch: Frame;
    }>
  >();
  bindKeyedChildren(details, properties, {
    key: (row) => row.key,
    create: () => {
      const frame = ui.frame(undefined);
      const name = ui.label(frame, '', {
        Size: udim2(0.46, -8, 1, 0),
        TextSize: 11,
        TextColor3: colors.muted,
      });
      const value = ui.label(frame, '', {
        Position: udim2(0.46, 6, 0, 0),
        Size: udim2(0.54, -6, 1, 0),
        TextSize: 11,
        FontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
      });
      value.unsafeElement.dataset.debugValue = '';
      const swatch = ui.frame(frame, {
        Size: udim2FromOffset(10, 10),
        Position: udim2(0.46, -10, 0.5, -5),
      });
      createUICorner({ CornerRadius: 3 }).Parent = swatch;
      propertyViews.set(frame, { name, value, swatch });
      frame.onDestroy(() => propertyViews.delete(frame));
      return frame;
    },
    update: (frame, row) => {
      const view = propertyViews.get(frame)!;
      const formatted = formatValue(row.value);
      frame.Size = udim2(1, -4, 0, row.heading ? 38 : 30);
      frame.unsafeElement.setAttribute('role', row.heading ? 'heading' : 'group');
      frame.unsafeElement.setAttribute(
        'aria-label',
        row.heading ? row.name : `${row.name}: ${formatted.text}`,
      );
      if (row.heading) {
        frame.unsafeElement.setAttribute('aria-level', '3');
      } else {
        frame.unsafeElement.removeAttribute('aria-level');
      }
      view.name.setProperties({
        Text: row.name,
        FontWeight: row.heading ? 650 : 450,
        TextColor3: row.heading ? colors.ink : colors.muted,
        Size: udim2(row.heading ? 1 : 0.46, -8, 1, 0),
      });
      view.value.setProperties({
        Text: `${row.animated ? '● ' : ''}${formatted.text}`,
        Visible: !row.heading,
        TextColor3: row.animated ? colors.accent : colors.ink,
      });
      view.value.unsafeElement.title = row.heading
        ? ''
        : (JSON.stringify(row.value) ?? String(row.value));
      view.swatch.setProperties({
        Visible: !row.heading && Boolean(formatted.swatch),
        BackgroundTransparency: formatted.swatch ? 0 : 1,
        BackgroundColor3: formatted.swatch ? color3FromHex(formatted.swatch) : colors.paper,
      });
    },
  });
  const refresh = (): void => {
    if (gui.isDestroyed()) {
      return;
    }
    if (root.isDestroyed()) {
      gui.destroy();
      return;
    }
    const live = new Set([root, ...root.getDescendants()]);
    for (const node of collapsed) {
      if (!live.has(node)) {
        collapsed.delete(node);
      }
    }
    history = history.filter((node) => live.has(node));
    if (!live.has(selected)) {
      selected = root;
    }
    historyIndex = history.indexOf(selected);
    if (historyIndex < 0) {
      history.push(selected);
      historyIndex = history.length - 1;
    }
    const projected = projectHierarchy(root, collapsed, search.Text);
    hierarchy.set(projected);
    treeRows.set(
      projected.map((row) => ({
        node: rows.get(row.node)!.frame,
        level: row.level,
        label: row.node.Name,
        selected: row.node === selected,
        ...(row.snapshot.children.length
          ? { expanded: Boolean(search.Text.trim()) || !collapsed.has(row.node) }
          : {}),
      })),
    );
    treeEmpty.Visible = projected.length === 0;
    treeCount.Text = `${projected.length} shown · ${live.size} instances`;
    expand.Disabled = collapse.Disabled = Boolean(search.Text.trim());
    back.Disabled = historyIndex === 0;
    forward.Disabled = historyIndex === history.length - 1;
    const path: Instance[] = [];
    for (
      let parent = selected === root ? undefined : selected.Parent;
      parent;
      parent = parent === root ? undefined : parent.Parent
    ) {
      path.unshift(parent);
    }
    ancestors.set(path.slice(-3));
    selectedName.Text = selected.Name;
    selectedName.unsafeElement.title = selected.getFullName();
    const snapshot = inspectInstance(selected);
    selectedClass.Text = `Class: ${snapshot.className}`;
    metricValues[0]!.Text = String(snapshot.children.length);
    metricValues[1]!.Text = String(snapshot.cleanupRegistrations);
    metricValues[2]!.Text = String(snapshot.animatedProperties.length);
    const term = propertySearch.Text.trim().toLowerCase();
    const groups = new Map<string, PropertyRow[]>();
    for (const [name, value] of Object.entries(snapshot.properties)) {
      if (term && !`${name} ${formatValue(value).text}`.toLowerCase().includes(term)) {
        continue;
      }
      const group = propertyGroup(name);
      const bucket = groups.get(group) ?? [];
      bucket.push({
        key: name,
        name,
        value,
        heading: false,
        animated: snapshot.animatedProperties.includes(name),
      });
      groups.set(group, bucket);
    }
    properties.set(
      [...groups].flatMap(([group, entries]) => [
        { key: `$${group}`, name: group, heading: true, animated: false },
        ...entries,
      ]),
    );
    propertyEmpty.Visible = groups.size === 0;
  };
  const showSelection = (): void => {
    for (
      let parent = selected === root ? undefined : selected.Parent;
      parent;
      parent = parent === root ? undefined : parent.Parent
    ) {
      collapsed.delete(parent);
    }
    if (
      search.Text.trim() &&
      !projectHierarchy(root, collapsed, search.Text).some((row) => row.node === selected)
    ) {
      search.Text = '';
    }
    compactPanel = 'details';
    layout();
    refresh();
    const row = rows.get(selected)?.frame;
    if (!tabs.Visible) {
      row?.focus({ preventScroll: true });
    }
    row?.unsafeElement.scrollIntoView({ block: 'nearest' });
    if (tabs.Visible) {
      detailsTab.focus();
    }
  };
  const select = (node: Instance): void => {
    if (node.isDestroyed() || (node !== root && !root.getDescendants().includes(node))) {
      throw new TypeError('Selection must belong to the inspected hierarchy.');
    }
    if (node !== selected) {
      history = history.slice(0, historyIndex + 1);
      history.push(node);
      historyIndex = history.length - 1;
    }
    selected = node;
    showSelection();
  };
  back.onClick(() => {
    if (historyIndex > 0) {
      selected = history[--historyIndex]!;
      showSelection();
    }
  });
  forward.onClick(() => {
    if (historyIndex + 1 < history.length) {
      selected = history[++historyIndex]!;
      showSelection();
    }
  });
  expand.onClick(() => {
    collapsed.clear();
    refresh();
  });
  collapse.onClick(() => {
    collapsed.add(root);
    refresh();
  });
  search.onTextChanged(refresh);
  propertySearch.onTextChanged(refresh);
  bindTreeView(tree, treeRows, {
    onSelect: (node) => {
      const instance = [...rows].find(([, view]) => view.frame === node)?.[0];
      if (instance) {
        select(instance);
      }
    },
    onToggle: (node, expanded) => {
      const instance = [...rows].find(([, view]) => view.frame === node)?.[0];
      if (instance) {
        if (expanded) {
          collapsed.delete(instance);
        } else {
          collapsed.add(instance);
        }
        refresh();
      }
    },
  });

  const stopPicking = (): void => {
    picking = false;
    pick.BackgroundColor3 = colors.canvas;
    pick.unsafeElement.setAttribute('aria-pressed', 'false');
    highlight.Visible = false;
    footer.Text = '●  Live   ·   Read only';
  };
  pick.unsafeElement.setAttribute('aria-pressed', 'false');
  pick.onClick(() => {
    if (picking) {
      stopPicking();
      return;
    }
    picking = true;
    pick.BackgroundColor3 = colors.selected;
    pick.unsafeElement.setAttribute('aria-pressed', 'true');
    footer.Text = 'Click an element in your app to inspect it · Esc cancels';
  });
  const pickTarget = (target: EventTarget | null): Instance | undefined => {
    if (!(target instanceof window.Element) || gui.unsafeElement.contains(target)) {
      return;
    }
    const elements = new Map(
      [root, ...root.getDescendants()].filter(isGuiNode).map((node) => [node.unsafeElement, node]),
    );
    for (let element: Element | null = target; element; element = element.parentElement) {
      const node = elements.get(element as HTMLElement);
      if (node) {
        return node;
      }
    }
    return undefined;
  };
  const movePicker = (event: PointerEvent): void => {
    if (!picking) {
      return;
    }
    const node = pickTarget(event.target);
    if (!node || !isGuiNode(node)) {
      highlight.Visible = false;
      return;
    }
    const rect = node.unsafeElement.getBoundingClientRect();
    highlight.setProperties({
      Visible: true,
      Position: udim2FromOffset(rect.left, rect.top),
      Size: udim2FromOffset(rect.width, rect.height),
    });
    highlightLabel.Text = ` ${node.Name} · ${node.ClassName}`;
    highlightLabel.Position = udim2FromOffset(-2, rect.top < 28 ? 0 : -26);
  };
  const blockPickerPointer = (event: PointerEvent): void => {
    if (picking && pickTarget(event.target)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  const clickPicker = (event: MouseEvent): void => {
    if (!picking) {
      return;
    }
    const node = pickTarget(event.target);
    if (!node) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    stopPicking();
    select(node);
  };
  const keydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) {
      return;
    }
    if (event.key === 'Escape') {
      if (picking) {
        event.preventDefault();
        stopPicking();
        pick.focus();
      } else if (panel.unsafeElement.contains(event.target as Node)) {
        event.preventDefault();
        if (event.target === search.unsafeElement && search.Text) {
          search.Text = '';
          refresh();
        } else if (event.target === propertySearch.unsafeElement && propertySearch.Text) {
          propertySearch.Text = '';
          refresh();
        } else {
          gui.destroy();
        }
      }
    } else if (
      event.key === '/' &&
      !isTextEntry(event.target) &&
      panel.unsafeElement.contains(event.target as Node)
    ) {
      event.preventDefault();
      search.focus();
    }
  };
  document.addEventListener('pointerdown', blockPickerPointer, true);
  document.addEventListener('pointerup', blockPickerPointer, true);
  document.addEventListener('pointermove', movePicker, true);
  document.addEventListener('click', clickPicker, true);
  document.addEventListener('keydown', keydown);
  window.addEventListener('resize', layout);
  const interval = window.setInterval(refresh, 250);
  const unregisterRoot = root.onDestroy(() => gui.destroy());
  gui.onDestroy(() => {
    window.clearInterval(interval);
    unregisterRoot();
    document.removeEventListener('pointerdown', blockPickerPointer, true);
    document.removeEventListener('pointerup', blockPickerPointer, true);
    document.removeEventListener('pointermove', movePicker, true);
    document.removeEventListener('click', clickPicker, true);
    document.removeEventListener('keydown', keydown);
    window.removeEventListener('resize', layout);
    collapsed.clear();
    history = [];
  });
  layout();
  refresh();
  return Object.freeze({ gui, select, refresh });
};
