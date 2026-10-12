import { getAnimatedProperties } from '#animation/runtime/ownership.js';
import { createFrame } from '#elements/frame.js';
import { createScreenGui, type ScreenGui } from '#elements/screen-gui.js';
import { createScrollingFrame } from '#elements/scrolling-frame.js';
import { createTextButton, createTextLabel } from '#elements/text.js';
import { bindKeyedChildren } from '#helpers/keyed-children.js';
import { bindTreeView, type TreeViewItem } from '#helpers/tree-view.js';
import type { Instance } from '#internal/runtime/node/instance.js';
import { getNodeState, getChildren } from '#internal/runtime/node/registry.js';
import { createUIListLayout } from '#modifiers/list-layout.js';
import { createObservableValue } from '#state/value.js';
import { color3FromRGB } from '#values/color3.js';
import { udim2, udim2FromOffset } from '#values/udim.js';

/** A detached, readonly diagnostic snapshot. Cleanup registrations are not a listener count. */
export type InstanceSnapshot = Readonly<{
  className: string;
  destroyed: boolean;
  parent: Instance | undefined;
  children: readonly Instance[];
  properties: Readonly<Record<string, unknown>>;
  cleanupRegistrations: number;
  animatedProperties: readonly string[];
}>;

/** Reads live or destroyed handles without exposing mutable runtime state. */
export const inspectInstance = (node: Instance): InstanceSnapshot => {
  const state = getNodeState(node);
  return Object.freeze({
    className: state.className,
    destroyed: state.destroyed,
    parent: state.parent,
    children: Object.freeze([...getChildren(state)]),
    properties: Object.freeze({ ...state.properties }),
    cleanupRegistrations: state.cleanups.size,
    animatedProperties: Object.freeze(getAnimatedProperties(node).map(String)),
  });
};

/** An independently mounted inspector; destroying gui stops polling and releases its observers. */
export type RuntimeInspector = Readonly<{
  gui: ScreenGui;
  select(node: Instance): void;
  refresh(): void;
}>;

/** Optional development UI, imported from framekit/devtools rather than the production entry. */
export const createRuntimeInspector = (root: Instance): RuntimeInspector => {
  if (root.isDestroyed()) {
    throw new Error('Cannot inspect a destroyed root.');
  }
  const gui = createScreenGui({ Name: 'FrameKitRuntimeInspector', DisplayOrder: 10000 });
  gui.unsafeElement.style.pointerEvents = 'none';
  const panel = createFrame(
    {
      Name: 'InspectorPanel',
      Size: udim2(0, 336, 1, 0),
      Position: udim2(1, -336, 0, 0),
      BackgroundColor3: color3FromRGB(17, 22, 29),
    },
    { tagName: 'aside' },
  );
  panel.unsafeElement.style.pointerEvents = 'auto';
  panel.unsafeElement.setAttribute('aria-label', 'FrameKit runtime inspector');
  panel.Parent = gui;
  const text = (Text: string, height = 24): ReturnType<typeof createTextLabel> =>
    createTextLabel({
      Text,
      Size: udim2(1, -24, 0, height),
      TextSize: 12,
      TextXAlignment: 'Left',
      TextColor3: color3FromRGB(244, 247, 250),
      BackgroundTransparency: 1,
      FontFamily: 'ui-monospace, monospace',
    });
  const heading = text('FrameKit runtime', 36);
  heading.Position = udim2FromOffset(12, 8);
  heading.Parent = panel;
  const close = createTextButton({
    Text: '×',
    Size: udim2FromOffset(32, 32),
    Position: udim2(1, -44, 0, 8),
    TextSize: 20,
    BackgroundTransparency: 1,
    TextColor3: color3FromRGB(244, 247, 250),
  });
  close.unsafeElement.setAttribute('aria-label', 'Close runtime inspector');
  close.onClick(() => gui.destroy());
  close.Parent = panel;
  const tree = createScrollingFrame({
    Name: 'RuntimeTree',
    Position: udim2FromOffset(12, 52),
    Size: udim2(1, -24, 0.45, -52),
    AutomaticCanvasSize: 'Y',
    ScrollingDirection: 'Y',
    BackgroundTransparency: 1,
  });
  tree.unsafeElement.setAttribute('aria-label', 'Runtime hierarchy');
  tree.Parent = panel;
  createUIListLayout().Parent = tree;
  const details = createScrollingFrame({
    Name: 'RuntimeDetails',
    Position: udim2(0, 12, 0.45, 16),
    Size: udim2(1, -24, 0.55, -28),
    AutomaticCanvasSize: 'Y',
    ScrollingDirection: 'Y',
    BackgroundTransparency: 1,
  });
  details.unsafeElement.setAttribute('aria-label', 'Runtime properties');
  details.Parent = panel;
  createUIListLayout().Parent = details;
  let selected = root;
  const collapsed = new Set<Instance>();
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
  type Row = Readonly<{ node: Instance; level: number; snapshot: InstanceSnapshot }>;
  const hierarchy = createObservableValue<readonly Row[]>([]);
  const rows = new Map<Instance, ReturnType<typeof createTextButton>>();
  bindKeyedChildren(tree, hierarchy, {
    key: (row) => key(row.node),
    create: (row) => {
      const button = createTextButton({
        Name: `Runtime:${key(row.node)}`,
        Size: udim2(1, 0, 0, 28),
        TextSize: 12,
        TextXAlignment: 'Left',
        TextColor3: color3FromRGB(244, 247, 250),
        BackgroundColor3: color3FromRGB(36, 87, 62),
        FontFamily: 'ui-monospace, monospace',
      });
      rows.set(row.node, button);
      button.onDestroy(() => rows.delete(row.node));
      return button;
    },
    update: (button, row) =>
      button.setProperties({
        Text: `${'  '.repeat(row.level - 1)}${String(row.snapshot.properties.Name)} (${row.snapshot.className})`,
        BackgroundTransparency: row.node === selected ? 0 : 1,
      }),
  });
  const treeRows = createObservableValue<readonly TreeViewItem[]>([]);
  const propertyRows = createObservableValue<readonly Readonly<{ key: string; text: string }>[]>(
    [],
  );
  bindKeyedChildren(details, propertyRows, {
    key: (row) => row.key,
    create: () => text('', 36),
    update: (node, row) => {
      node.Text = row.text;
      node.unsafeElement.title = row.text;
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
    if (!live.has(selected)) {
      selected = root;
    }
    const next: Row[] = [];
    const visit = (node: Instance, level: number): void => {
      const snapshot = inspectInstance(node);
      next.push({ node, level, snapshot });
      if (!collapsed.has(node)) {
        snapshot.children.forEach((child) => visit(child, level + 1));
      }
    };
    visit(root, 1);
    hierarchy.set(next);
    treeRows.set(
      next.map((row) => ({
        node: rows.get(row.node)!,
        level: row.level,
        label: String(row.snapshot.properties.Name),
        selected: row.node === selected,
        ...(row.snapshot.children.length > 0 ? { expanded: !collapsed.has(row.node) } : {}),
      })),
    );
    const snapshot = inspectInstance(selected);
    const serialize = (value: unknown): string =>
      typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value));
    propertyRows.set([
      { key: '$class', text: `Class: ${snapshot.className}` },
      { key: '$cleanup', text: `Cleanup registrations: ${snapshot.cleanupRegistrations}` },
      { key: '$animation', text: `Animated: ${snapshot.animatedProperties.join(', ') || 'none'}` },
      ...Object.entries(snapshot.properties).map(([name, value]) => ({
        key: name,
        text: `${name}: ${serialize(value)}`,
      })),
    ]);
  };
  const select = (node: Instance): void => {
    if (node !== root && !root.getDescendants().includes(node)) {
      throw new TypeError('Selection must belong to the inspected hierarchy.');
    }
    selected = node;
    refresh();
  };
  bindTreeView(tree, treeRows, {
    onSelect: (node) => {
      const instance = [...rows].find(([, row]) => row === node)?.[0];
      if (instance) {
        select(instance);
      }
    },
    onToggle: (node, expanded) => {
      const instance = [...rows].find(([, row]) => row === node)?.[0];
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
  const interval = setInterval(refresh, 250);
  const unregisterRoot = root.onDestroy(() => gui.destroy());
  gui.onDestroy(() => {
    clearInterval(interval);
    unregisterRoot();
  });
  refresh();
  return Object.freeze({ gui, select, refresh });
};
