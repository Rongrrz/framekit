import type { Frame } from '#elements/frame.js';
import type { ScreenGui } from '#elements/screen-gui.js';
import type { ScrollingFrame } from '#elements/scrolling-frame.js';
import type { TextInput } from '#elements/text-input.js';
import type { TextButton, TextLabel } from '#elements/text.js';
import { createUICorner } from '#modifiers/corner.js';
import { createUIListLayout } from '#modifiers/list-layout.js';
import { udim, udim2, udim2FromOffset } from '#values/udim.js';

import { colors, createDebugUI, installInspectorStyles } from './view.js';

type HierarchyControls = Readonly<{
  panel: Frame;
  tab: TextButton;
  expand: TextButton;
  collapse: TextButton;
  search: TextInput;
  tree: ScrollingFrame;
  empty: TextLabel;
  count: TextLabel;
}>;
type DetailControls = Readonly<{
  panel: Frame;
  tab: TextButton;
  back: TextButton;
  forward: TextButton;
  breadcrumbs: Frame;
  name: TextLabel;
  className: TextLabel;
  metricValues: readonly TextLabel[];
  search: TextInput;
  properties: ScrollingFrame;
  empty: TextLabel;
}>;
export type InspectorWorkspace = Readonly<{
  panel: Frame;
  header: Frame;
  pick: TextButton;
  tabs: Frame;
  divider: Frame;
  footer: TextLabel;
  highlight: Frame;
  highlightLabel: TextLabel;
  hierarchy: HierarchyControls;
  details: DetailControls;
}>;
let inspectorId = 0;

/** Builds the inspector's native workspace; controllers own selection, observation, and input. */
export const createInspectorWorkspace = (gui: ScreenGui): InspectorWorkspace => {
  const document = gui.unsafeElement.ownerDocument;
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
  createUICorner({ CornerRadius: 10 }).Parent = panel;
  const header = ui.frame(panel, { Size: udim2(1, 0, 0, 64) });
  const mark = ui.label(header, 'fk', {
    Position: udim2FromOffset(20, 16),
    Size: udim2FromOffset(32, 32),
    FontWeight: 800,
    TextSize: 21,
    TextColor3: colors.accent,
  });
  mark.unsafeElement.setAttribute('aria-hidden', 'true');
  ui.label(header, 'Inspector', {
    Position: udim2FromOffset(60, 12),
    Size: udim2FromOffset(116, 24),
    TextSize: 15,
    FontWeight: 700,
  });
  ui.label(header, 'FRAMEKIT TOOLS', {
    Position: udim2FromOffset(60, 34),
    Size: udim2FromOffset(92, 16),
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
  search.unsafeElement.title = 'Search name or class · / focuses search · Escape clears';
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
  const footer = ui.label(panel, '● Live · Read only    Drag title · Resize edges', {
    Position: udim2(0, 20, 1, -32),
    Size: udim2(1, -40, 0, 24),
    TextSize: 10,
    TextColor3: colors.muted,
  });
  line(panel, udim2(0, 0, 1, -38), udim2(1, 0, 0, 1));
  const highlight = ui.frame(gui, { Name: 'PickedElement', Visible: false, ZIndex: 2 });
  highlight.unsafeElement.style.border = '2px solid #2563eb';
  highlight.unsafeElement.style.boxShadow = '0 0 0 3px #2563eb25';
  const highlightLabel = ui.label(highlight, '', {
    Position: udim2FromOffset(-2, -26),
    Size: udim2FromOffset(240, 24),
    BackgroundTransparency: 0,
    BackgroundColor3: colors.accent,
    TextColor3: colors.paper,
    TextSize: 11,
  });

  return {
    panel,
    header,
    pick,
    tabs,
    divider,
    footer,
    highlight,
    highlightLabel,
    hierarchy: {
      panel: hierarchyPanel,
      tab: hierarchyTab,
      expand,
      collapse,
      search,
      tree,
      empty: treeEmpty,
      count: treeCount,
    },
    details: {
      panel: detailPanel,
      tab: detailsTab,
      back,
      forward,
      breadcrumbs,
      name: selectedName,
      className: selectedClass,
      metricValues,
      search: propertySearch,
      properties: details,
      empty: propertyEmpty,
    },
  };
};
