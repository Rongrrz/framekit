import {
  bindKeyedChildren,
  bindMenu,
  bindTreeView,
  createObservableValue,
  createTextButton,
  setAccessibility,
  udim2,
  udim2FromOffset,
  watchOwnedValue,
  vector2,
  type Frame,
  type TreeViewItem,
} from 'framekit';

import { orderedNodes } from './document';
import type { Editor } from './editor';
import { bindHierarchyDrag } from './hierarchy-drag';
import { definitionFor, type NodeType } from './schema';
import { decorateTreeRow } from './tree-appearance';
import { button, colors, font, input, label, panel, round, scroll } from './ui';

/** Filtering preserves ancestor rows so depth-first keyboard navigation stays meaningful. */
export const createHierarchy = (
  parent: Frame,
  editor: Editor,
  insert: () => void,
  move: () => void,
  perform: (action: () => void) => void,
  report: (message: string) => void,
): void => {
  const heading = label(parent, 'EXPLORER', 38, 10, colors.muted);
  heading.Position = udim2FromOffset(16, 4);
  heading.Size = udim2(1, -108, 0, 38);
  heading.LetterSpacing = 1.4;
  heading.FontWeight = 650;
  const add = button(parent, '+', insert, 28);
  add.AccessibleLabel = 'Insert in Explorer';
  add.Position = udim2(1, -76, 0, 8);
  add.BackgroundTransparency = 1;
  const more = button(parent, '•••', () => {}, 32);
  more.AccessibleLabel = 'Explorer actions';
  more.Position = udim2(1, -42, 0, 8);
  more.BackgroundTransparency = 1;
  const search = input(parent, 'Search hierarchy');
  search.PlaceholderText = 'Find a layer…';
  search.Position = udim2FromOffset(12, 48);
  search.Size = udim2(1, -24, 0, 32);
  const tree = scroll(parent, 'Scene hierarchy');
  const root = button(parent, '▱  Canvas', () => editor.select(null));
  root.AccessibleLabel = 'Canvas root';
  root.Position = udim2FromOffset(10, 88);
  root.Size = udim2(1, -20, 0, 30);
  root.TextXAlignment = 'Left';
  root.TextSize = 11;
  root.TextColor3 = colors.muted;
  root.BackgroundTransparency = 1;
  root.unsafeElement.title = 'Drop here to move an object to the top level';
  tree.Position = udim2FromOffset(8, 124);
  tree.Size = udim2(1, -16, 1, -178);
  setAccessibility(tree, { label: 'Scene hierarchy' });
  const rows = createObservableValue<readonly TreeViewItem[]>([]);
  const source = createObservableValue<
    readonly {
      id: string;
      depth: number;
      name: string;
      type: NodeType;
      prefab: boolean;
      branch: boolean;
      expanded: boolean;
      selected: boolean;
      hidden: boolean;
    }[]
  >([]);
  const collapsed = new Set<string>();
  let lastSelection: string | null = null;
  const rowIds = new Map<Frame, string>();
  const count = label(parent, '', 24, 10, colors.faint);
  count.Position = udim2(0, 16, 1, -49);
  count.Size = udim2(1, -32, 0, 24);
  const help = label(
    parent,
    'Drag to move · F2 rename · Right-click for more',
    20,
    9,
    colors.faint,
  );
  help.Position = udim2(0, 16, 1, -25);
  help.Size = udim2(1, -32, 0, 20);
  help.ClipsDescendants = true;

  const publish = (): void => {
    const { document, selectedId } = editor.state.get();
    const nodes = orderedNodes(document);
    const term = search.Text.toLowerCase().trim();
    const included = new Set<string>();
    const byId = new Map(nodes.map((node) => [node.id, node]));

    if (selectedId !== lastSelection) {
      let selected = selectedId ? byId.get(selectedId) : undefined;

      while (selected?.parent) {
        collapsed.delete(selected.parent);
        selected = byId.get(selected.parent);
      }

      lastSelection = selectedId;
    }

    for (const node of nodes) {
      if (!term || `${node.properties.Name} ${node.type}`.toLowerCase().includes(term)) {
        let current = node;
        included.add(current.id);

        while (current.parent !== null) {
          current = byId.get(current.parent)!;
          included.add(current.id);
        }
      }
    }

    const hidden = new Set<string>();
    const depth = new Map<string, number>();
    const branches = new Set(nodes.map((node) => node.parent));
    const visible = nodes.filter((node) => {
      depth.set(node.id, node.parent === null ? 1 : depth.get(node.parent)! + 1);

      if (
        node.parent !== null &&
        (hidden.has(node.parent) || (!term && collapsed.has(node.parent)))
      ) {
        hidden.add(node.id);
      }

      return included.has(node.id) && !hidden.has(node.id);
    });

    source.set(
      visible.map((node) => ({
        id: node.id,
        depth: depth.get(node.id)!,
        name: node.properties.Name,
        type: node.type,
        prefab: Boolean(node.prefabId),
        branch: branches.has(node.id),
        expanded: Boolean(term) || !collapsed.has(node.id),
        selected: selectedId === node.id,
        hidden: node.properties.Visible === false,
      })),
    );
    count.Text = `${document.nodes.length} objects · ${visible.length} visible`;
  };

  bindKeyedChildren(tree, source, {
    key: (item) => item.id,
    create: (item) => {
      const row = createTextButton({
        Name: 'Layer',
        Size: udim2(1, -4, 0, 34),
        TextSize: 12,
        FontFamily: font,
        TextXAlignment: 'Left',
        BackgroundTransparency: 1,
        TextColor3: colors.text,
      });
      rowIds.set(row, item.id);
      row.unsafeElement.dataset.explorerId = item.id;
      round(row, 6);
      row.on('click', (event) => {
        const current = source.get().find((entry) => entry.id === item.id);
        const x = event.clientX - row.unsafeElement.getBoundingClientRect().left;
        const chevron = 8 + (current ? current.depth - 1 : 0) * 14;

        if (current?.branch && x >= chevron && x <= chevron + 24) {
          event.stopPropagation();

          if (collapsed.has(item.id)) {
            collapsed.delete(item.id);
          } else {
            collapsed.add(item.id);
          }

          publish();
        }
      });
      row.on('contextmenu', (event) => event.preventDefault());

      // Opening before release lets native light dismissal immediately hide the menu.
      row.onSecondaryClick((event) => {
        editor.select(item.id);
        menu.open(vector2(event.clientX, event.clientY));
      });
      row.onDestroy(() => rowIds.delete(row));
      row.on('dblclick', () => {
        if (collapsed.has(item.id)) {
          collapsed.delete(item.id);
        } else {
          collapsed.add(item.id);
        }

        publish();
      });
      return row;
    },
    update: (row, item, index) => {
      const icon = item.prefab
        ? 'prefab'
        : definitionFor(item.type).category === 'modifier'
          ? 'modifier'
          : item.type === 'TextButton'
            ? 'button'
            : item.type === 'TextInput'
              ? 'input'
              : item.type === 'ImageLabel'
                ? 'image'
                : item.type === 'TextLabel'
                  ? 'text'
                  : 'frame';
      row.Text = `${item.name}${item.hidden ? '  ◌' : ''}`;
      decorateTreeRow(row, item.depth, icon, item.branch ? item.expanded : undefined);
      row.AccessibleLabel = item.name;
      row.Position = udim2FromOffset(2, index * 36);
      row.BackgroundTransparency = item.selected ? 0 : 1;
      row.BackgroundColor3 = colors.selected;
      row.TextColor3 = item.selected
        ? colors.accent
        : item.hidden
          ? colors.faint
          : definitionFor(item.type).category === 'modifier'
            ? colors.muted
            : colors.text;
      row.FontWeight = item.selected ? 600 : 450;
      row.unsafeElement.title = `${item.name} · ${item.type}${item.hidden ? ' · Hidden' : ''}`;
    },
  });

  bindTreeView(tree, rows, {
    onSelect: (node) => editor.select(rowIds.get(node as Frame) ?? null),
    onToggle: (node, expanded) => {
      const id = rowIds.get(node as Frame)!;

      if (expanded) {
        collapsed.delete(id);
      } else {
        collapsed.add(id);
      }

      publish();
    },
  });

  const rename = input(tree, 'Rename object');
  rename.Visible = false;
  rename.ZIndex = 12;
  rename.unsafeElement.setAttribute('maxlength', '200');
  let renaming: string | undefined;

  const finishRename = (commit: boolean): void => {
    const id = renaming;
    renaming = undefined;
    rename.Visible = false;

    if (commit && id && rename.Text.trim()) {
      perform(() => editor.edit(id, 'Name', rename.Text.trim()));
    }

    [...rowIds].find(([, rowId]) => rowId === id)?.[0].focus();
  };

  const startRename = (): void => {
    const { document, selectedId } = editor.state.get();
    const node = document.nodes.find((entry) => entry.id === selectedId);
    const row = [...rowIds].find(([, id]) => id === selectedId)?.[0];

    if (!node || !row) {
      return;
    }

    row.unsafeElement.scrollIntoView({ block: 'nearest' });
    const bounds = row.unsafeElement.getBoundingClientRect();
    const origin = tree.unsafeElement.getBoundingClientRect();
    renaming = node.id;
    rename.Position = udim2FromOffset(
      bounds.left - origin.left + 22,
      bounds.top - origin.top + tree.CanvasPosition.Y,
    );
    rename.Size = udim2FromOffset(bounds.width - 24, 34);
    rename.Text = node.properties.Name;
    rename.Visible = true;
    rename.focus();
    rename.unsafeElement.select();
  };

  rename.on('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === 'Escape') && !event.isComposing) {
      event.preventDefault();
      event.stopPropagation();
      finishRename(event.key === 'Enter');
    }
  });
  rename.on('blur', () => {
    if (renaming) {
      finishRename(true);
    }
  });

  const reorder = (direction: -1 | 1): void => {
    const { document, selectedId } = editor.state.get();
    const node = document.nodes.find((entry) => entry.id === selectedId);

    if (!node) {
      return;
    }

    const siblings = document.nodes.filter((entry) => entry.parent === node.parent);
    const index = siblings.indexOf(node);
    const next = siblings[index + direction];

    if (next) {
      const before = direction < 0 ? next.id : siblings[index + 2]?.id;
      editor.move(node.id, { parent: node.parent, ...(before ? { before } : {}) });
    }
  };

  const menuPanel = panel('Explorer context menu', parent);
  menuPanel.Size = udim2FromOffset(230, 466);
  round(menuPanel, 8, true);
  const actions = [
    ['Rename                 F2', startRename],
    ['Duplicate            ⌘/Ctrl D', editor.duplicate],
    [
      'Cut                      ⌘/Ctrl X',
      () => {
        editor.copy(true);
        report('Cut branch. Select a destination and paste to move it.');
      },
    ],
    [
      'Copy                    ⌘/Ctrl C',
      () => {
        editor.copy();
        report('Copied branch. Select a destination and paste.');
      },
    ],
    ['Paste into             ⌘/Ctrl V', editor.paste],
    ['Move to…', move],
    ['Move up                Alt ↑', () => reorder(-1)],
    ['Move down           Alt ↓', () => reorder(1)],
    [
      'Show / hide',
      () => {
        const { document, selectedId } = editor.state.get();
        const node = document.nodes.find((entry) => entry.id === selectedId);

        if (node && 'Visible' in node.properties) {
          editor.edit(node.id, 'Visible', !node.properties.Visible);
        }
      },
    ],
    ['Delete                    Del', editor.remove],
    [
      'Expand all',
      () => {
        collapsed.clear();
        publish();
      },
    ],
    [
      'Collapse all',
      () => {
        editor.state.get().document.nodes.forEach((node) => collapsed.add(node.id));
        publish();
      },
    ],
  ] as const;
  const items = actions.map(([text, run], index) => {
    const control = button(
      menuPanel,
      text,
      () => {
        menu.close();
        perform(run);
      },
      214,
    );
    control.on('click', (event) => event.stopPropagation());
    control.Position = udim2FromOffset(8, 6 + index * 38);
    control.BackgroundTransparency = 1;
    control.TextXAlignment = 'Left';
    control.TextSize = 12;
    control.FontFamily = font;
    control.AccessibleLabel = text.split(/  +/)[0]!;
    return control;
  });
  items[9]!.TextColor3 = colors.danger;
  const menu = bindMenu(more, menuPanel, items);
  tree.on(
    'keydown',
    (event) => {
      if (event.key === 'F2') {
        event.preventDefault();
        startRename();
      } else if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        perform(() => reorder(event.key === 'ArrowUp' ? -1 : 1));
      } else if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
        event.preventDefault();
        const row = [...rowIds].find(([, id]) => id === editor.state.get().selectedId)?.[0];
        const bounds = (row ?? tree).unsafeElement.getBoundingClientRect();
        menu.open(vector2(bounds.left + 24, bounds.bottom));
      }
    },
    { capture: true },
  );
  bindHierarchyDrag(
    parent,
    tree,
    root,
    editor,
    (id) => {
      if (collapsed.delete(id)) {
        publish();
      }
    },
    report,
  );

  watchOwnedValue(parent, source, (items) => {
    rows.set(
      items.map((item) => ({
        node: [...rowIds].find(([, id]) => id === item.id)![0],
        level: item.depth,
        label: item.name,
        selected: item.selected,
        ...(item.branch ? { expanded: item.expanded } : {}),
      })),
    );
  });
  watchOwnedValue(parent, editor.state, publish);
  search.onTextChanged(publish);
};
