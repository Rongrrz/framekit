import { createScreenGui, type ScreenGui } from '#elements/screen-gui.js';
import { isTextEntry } from '#helpers/composite-keyboard.js';
import type { Instance } from '#internal/runtime/node/instance.js';
import { udim2, udim2FromOffset } from '#values/udim.js';

import { bindInspectorDetails } from './details-view.js';
import { bindInspectorHierarchy } from './hierarchy-view.js';
import { projectHierarchy } from './model.js';
import { bindInspectorPicker } from './picker.js';
import { inspectionDocument } from './snapshot.js';
import { colors } from './view.js';
import { bindInspectorWindow } from './window.js';
import { createInspectorWorkspace } from './workspace.js';

/** An independently mounted inspector. Destroying gui stops observation and picking. */
export type RuntimeInspector = Readonly<{
  gui: ScreenGui;
  select(node: Instance): void;
  refresh(): void;
}>;

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
  const workspace = createInspectorWorkspace(gui);
  const {
    panel,
    header,
    pick,
    tabs,
    divider,
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
    details: { panel: detailPanel, tab: detailsTab, back, forward, search: propertySearch },
  } = workspace;

  let selected = root;
  let history: Instance[] = [root];
  let historyIndex = 0;
  let compactPanel: 'hierarchy' | 'details' = 'hierarchy';
  const collapsed = new Set(
    projectHierarchy(root, new Set(), '')
      .filter((row) => row.level >= 3 && row.snapshot.children.length > 0)
      .map((row) => row.node),
  );
  const layout = (): void => {
    const panelWidth = panel.Size.X.Offset;
    const compact = panelWidth < 600;
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
  const updateWindow = bindInspectorWindow(panel, header, layout);

  const hierarchyView = bindInspectorHierarchy(tree, {
    onSelect: (node) => select(node),
    onToggle: (node, expanded) => {
      if (expanded) {
        collapsed.delete(node);
      } else {
        collapsed.add(node);
      }
      refresh();
    },
  });
  const updateDetails = bindInspectorDetails(workspace.details, (node) => select(node));
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
    hierarchyView.render(projected, selected, collapsed, search.Text);
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
    updateDetails(selected, path, propertySearch.Text);
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
    hierarchyView.reveal(selected, !tabs.Visible);
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
  const cancelPicking = bindInspectorPicker(root, gui, workspace, (node) => select(node));
  const keydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) {
      return;
    }
    if (event.key === 'Escape') {
      if (cancelPicking()) {
        event.preventDefault();
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
  document.addEventListener('keydown', keydown);
  const interval = window.setInterval(refresh, 250);
  const unregisterRoot = root.onDestroy(() => gui.destroy());
  gui.onDestroy(() => {
    window.clearInterval(interval);
    unregisterRoot();
    document.removeEventListener('keydown', keydown);
    collapsed.clear();
    history = [];
  });
  updateWindow();
  refresh();
  return Object.freeze({ gui, select, refresh });
};
