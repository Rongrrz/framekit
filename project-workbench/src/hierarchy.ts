import {
  bindKeyedChildren,
  bindTreeView,
  createObservableValue,
  createTextButton,
  setAccessibility,
  udim2,
  udim2FromOffset,
  watchOwnedValue,
  type Frame,
  type TreeViewItem,
} from 'framekit';

import { orderedNodes } from './document';
import type { Editor } from './editor';
import { definitionFor, type NodeType } from './schema';
import { colors, font, input, label, scroll } from './ui';

/** Filtering preserves ancestor rows so depth-first keyboard navigation stays meaningful. */
export const createHierarchy = (parent: Frame, editor: Editor): void => {
  const heading = label(parent, 'EXPLORER', 38, 10, colors.muted);
  heading.Position = udim2FromOffset(16, 4);
  heading.Size = udim2(1, -32, 0, 38);
  heading.LetterSpacing = 1.4;
  heading.FontWeight = 650;
  const search = input(parent, 'Search hierarchy');
  search.PlaceholderText = 'Find a layer…';
  search.Position = udim2FromOffset(12, 48);
  search.Size = udim2(1, -24, 0, 32);
  const tree = scroll(parent, 'Scene hierarchy');
  tree.Position = udim2FromOffset(8, 94);
  tree.Size = udim2(1, -16, 1, -130);
  setAccessibility(tree, { label: 'Scene hierarchy' });
  const rows = createObservableValue<readonly TreeViewItem[]>([]);
  const source = createObservableValue<
    readonly {
      id: string;
      depth: number;
      name: string;
      type: NodeType;
      branch: boolean;
      expanded: boolean;
      selected: boolean;
    }[]
  >([]);
  const collapsed = new Set<string>();
  let lastSelection: string | null = null;
  const rowIds = new Map<Frame, string>();
  const count = label(parent, '', 24, 10, colors.faint);
  count.Position = udim2(0, 16, 1, -30);

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
        branch: branches.has(node.id),
        expanded: Boolean(term) || !collapsed.has(node.id),
        selected: selectedId === node.id,
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
      const icon = item.branch
        ? item.expanded
          ? '▾'
          : '▸'
        : definitionFor(item.type).category === 'modifier'
          ? '◇'
          : '·';
      row.Text = `${'   '.repeat(item.depth - 1)}${icon}  ${item.name}`;
      row.AccessibleLabel = item.name;
      row.Position = udim2FromOffset(2, index * 36);
      row.BackgroundTransparency = item.selected ? 0 : 1;
      row.BackgroundColor3 = colors.selected;
      row.TextColor3 = item.selected ? colors.accent : colors.text;
      row.unsafeElement.title = `${item.name} · ${item.type}`;
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
