import {
  bindKeyedChildren,
  createObservableValue,
  setAccessibility,
  udim2,
  udim2FromOffset,
  watchOwnedValue,
  type Frame,
} from 'framekit';

import type { PrefabDefinition } from './document';
import type { Editor } from './editor';
import { decorateTreeRow } from './tree-appearance';
import { button, colors, input, label, panel, round, scroll } from './ui';

/** Definitions live in the library; inserting creates a link rather than copying their internals. */
export const createPrefabLibrary = (
  parent: Frame,
  editor: Editor,
  edit: (id: string) => void,
  perform: (action: () => void) => void,
): Frame => {
  const library = panel('Prefab library', parent);
  setAccessibility(library, { role: 'region', label: 'Prefab library' });
  const heading = label(library, 'PREFABS', 38, 10, colors.muted);
  heading.Position = udim2FromOffset(16, 4);
  heading.LetterSpacing = 1.4;
  const search = input(library, 'Search prefabs');
  search.PlaceholderText = 'Find a component…';
  search.Position = udim2FromOffset(12, 48);
  search.Size = udim2(1, -24, 0, 32);
  const create = button(library, '+ Create prefab', () =>
    perform(() => {
      const snapshot = editor.state.get();
      const selected = snapshot.document.nodes.find((node) => node.id === snapshot.selectedId);
      const id = editor.createPrefab(selected?.properties.Name ?? 'New prefab');
      edit(id);
    }),
  );
  create.Position = udim2FromOffset(12, 92);
  create.Size = udim2(1, -24, 0, 34);
  create.BackgroundColor3 = colors.selected;
  create.TextColor3 = colors.accent;
  const hint = label(
    library,
    'Converts the selected branch, or creates an empty component when nothing is selected.',
    58,
    11,
    colors.muted,
  );
  hint.Position = udim2FromOffset(14, 134);
  hint.Size = udim2(1, -28, 0, 58);
  hint.TextWrapped = true;
  const viewport = scroll(library, 'Reusable components');
  viewport.Position = udim2FromOffset(10, 202);
  viewport.Size = udim2(1, -20, 1, -236);
  const empty = label(
    viewport,
    'Your reusable components will appear here. Prefabs can contain other prefabs.',
    80,
    12,
    colors.muted,
  );
  empty.TextWrapped = true;
  const source = createObservableValue<readonly PrefabDefinition[]>([]);
  const count = label(library, '', 24, 10, colors.faint);
  count.Position = udim2(0, 14, 1, -30);

  bindKeyedChildren(viewport, source, {
    key: (prefab) => prefab.id,
    create: (prefab) => {
      const card = panel('Prefab', viewport, colors.raised);
      card.Parent = undefined;
      round(card, 8, true);
      const name = label(card, '', 28, 13);
      name.Name = 'Prefab name';
      name.Position = udim2FromOffset(0, 5);
      decorateTreeRow(name, 1, 'prefab');
      name.Size = udim2(1, -24, 0, 28);
      name.FontWeight = 600;
      const metadata = label(card, '', 24, 10, colors.muted);
      metadata.Name = 'Prefab metadata';
      metadata.Position = udim2FromOffset(12, 33);
      metadata.Size = udim2(1, -24, 0, 24);
      const insert = button(
        card,
        'Insert',
        () => perform(() => editor.insertPrefab(prefab.id)),
        64,
      );
      insert.Position = udim2FromOffset(10, 64);
      insert.AccessibleLabel = `Insert prefab ${prefab.id}`;
      const editButton = button(card, 'Edit', () => perform(() => edit(prefab.id)), 54);
      editButton.Position = udim2FromOffset(80, 64);
      const remove = button(card, '×', () => perform(() => editor.removePrefab(prefab.id)), 30);
      remove.Position = udim2(1, -40, 0, 64);
      remove.TextColor3 = colors.danger;
      return card;
    },
    update: (card, prefab, index) => {
      card.Position = udim2FromOffset(0, index * 116);
      card.Size = udim2(1, -6, 0, 106);
      for (const child of card.getChildren()) {
        if (child.isA('TextLabel')) {
          child.Text =
            child.Name === 'Prefab name'
              ? prefab.name
              : `${prefab.nodes.length} objects · ${prefab.events?.length ?? 0} custom events`;
        } else if (child.isA('TextButton')) {
          child.AccessibleLabel = `${child.Name === '×' ? 'Delete' : child.Name} prefab ${prefab.name}`;
        }
      }
    },
  });

  const publish = (): void => {
    const prefabs = editor.state.get().project.prefabs ?? [];
    const term = search.Text.trim().toLowerCase();
    source.set(prefabs.filter((prefab) => prefab.name.toLowerCase().includes(term)));
    empty.Visible = source.get().length === 0;
    count.Text = `${prefabs.length} shared components`;
  };

  search.onTextChanged(publish);
  watchOwnedValue(library, editor.state, publish);
  return library;
};
