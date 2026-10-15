import type { Frame } from '#elements/frame.js';
import type { ScrollingFrame } from '#elements/scrolling-frame.js';
import type { TextButton } from '#elements/text.js';
import { bindKeyedChildren } from '#helpers/keyed-children.js';
import { bindTreeView, type TreeViewItem } from '#helpers/tree-view.js';
import type { Instance } from '#internal/runtime/node/instance.js';
import { createUICorner } from '#modifiers/corner.js';
import { createObservableValue } from '#state/value.js';
import { udim2, udim2FromOffset } from '#values/udim.js';

import type { HierarchyRow } from './model.js';
import { colors, createDebugUI } from './view.js';

type HierarchyItem = HierarchyRow &
  Readonly<{ selected: boolean; collapsed: boolean; searching: boolean }>;
type HierarchyView = Readonly<{
  render(
    projected: readonly HierarchyRow[],
    selected: Instance,
    collapsed: ReadonlySet<Instance>,
    query: string,
  ): void;
  reveal(node: Instance, focus: boolean): void;
}>;
/** Owns keyed hierarchy row views and their tree semantics, independent of inspector navigation. */
export const bindInspectorHierarchy = (
  tree: ScrollingFrame,
  options: Readonly<{
    onSelect(node: Instance): void;
    onToggle(node: Instance, expanded: boolean): void;
  }>,
): HierarchyView => {
  const ui = createDebugUI(tree.unsafeElement.ownerDocument);
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
  const hierarchy = createObservableValue<readonly HierarchyItem[]>([]);
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
        const current = hierarchy.get().find((item) => item.node === row.node);
        if (!current || current.searching) {
          return;
        }
        options.onToggle(current.node, current.collapsed);
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
      frame.BackgroundTransparency = row.selected ? 0 : 1;
      frame.unsafeElement.setAttribute(
        'aria-label',
        `${row.node.Name} (${row.snapshot.className})`,
      );
      view.toggle.setProperties({
        Text: row.searching || !row.collapsed ? '⌄' : '›',
        Visible: row.snapshot.children.length > 0,
        Disabled: row.searching,
        Position: udim2FromOffset(inset, 2),
        AccessibleLabel: `${row.collapsed ? 'Expand' : 'Collapse'} ${row.node.Name}`,
      });
      view.name.setProperties({
        Text: row.node.Name,
        Position: udim2FromOffset(inset + 24, 0),
        Size: udim2(1, -inset - 106, 1, 0),
        FontWeight: row.selected ? 650 : 450,
      });
      view.name.unsafeElement.title = row.node.Name;
      view.badge.Text = row.snapshot.className.replace(/^UI/, '');
    },
  });
  bindTreeView(tree, treeRows, {
    onSelect: (node) => {
      const instance = [...rows].find(([, view]) => view.frame === node)?.[0];
      if (instance) {
        options.onSelect(instance);
      }
    },
    onToggle: (node, expanded) => {
      const instance = [...rows].find(([, view]) => view.frame === node)?.[0];
      if (instance) {
        options.onToggle(instance, expanded);
      }
    },
  });
  return {
    render: (projected, selected, collapsed, query): void => {
      const searching = Boolean(query.trim());
      const items = projected.map((row) => ({
        ...row,
        selected: row.node === selected,
        collapsed: collapsed.has(row.node),
        searching,
      }));
      hierarchy.set(items);
      treeRows.set(
        items.map((row) => ({
          node: rows.get(row.node)!.frame,
          level: row.level,
          label: row.node.Name,
          selected: row.selected,
          ...(row.snapshot.children.length ? { expanded: row.searching || !row.collapsed } : {}),
        })),
      );
    },
    reveal: (node, focus): void => {
      const row = rows.get(node)?.frame;
      if (focus) {
        row?.focus({ preventScroll: true });
      }
      row?.unsafeElement.scrollIntoView({ block: 'nearest' });
    },
  };
};
