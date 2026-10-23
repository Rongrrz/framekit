import {
  bindKeyedChildren,
  createFrame,
  createObservableValue,
  udim2,
  udim2FromOffset,
  watchOwnedValue,
  type Frame,
  type TextButton,
  type TextInput,
} from 'framekit';

import type { Editor } from './editor';
import { definitionFor, formatField, parseField, type Field, type PropertyValue } from './schema';
import { button, colors, input, label, panel, scroll, stack } from './ui';

type PropertyRow = Readonly<{
  key: string;
  name: string;
  field: Field;
  value: PropertyValue;
  nodeId: string | null;
}>;

const documentFields = {
  name: { kind: 'text', value: '' },
  width: { kind: 'number', value: 960, min: 240, max: 4096 },
  height: { kind: 'number', value: 640, min: 240, max: 4096 },
} satisfies Record<string, Field>;

/** Controls retain their editing buffers until Enter or blur commits a complete value. */
export const createProperties = (
  parent: Frame,
  editor: Editor,
  move: () => void,
  report: (message: string) => void,
  perform: (action: () => void) => void,
): void => {
  const heading = label(parent, 'PROPERTIES', 38, 10, colors.muted);
  heading.Position = udim2FromOffset(16, 4);
  heading.LetterSpacing = 1.4;
  heading.FontWeight = 650;
  const name = label(parent, '', 28, 17);
  name.Position = udim2FromOffset(16, 44);
  name.Size = udim2(1, -32, 0, 28);
  name.FontWeight = 600;
  const type = label(parent, '', 22, 11, colors.muted);
  type.Position = udim2FromOffset(16, 72);
  type.Size = udim2(1, -32, 0, 22);

  const actions = panel('Selection actions', parent);
  actions.Position = udim2FromOffset(12, 102);
  actions.Size = udim2(1, -24, 0, 30);
  stack(actions, 6, true);
  const duplicate = button(actions, 'Duplicate', () => perform(editor.duplicate), 84);
  const relocate = button(actions, 'Move…', move, 66);
  const remove = button(actions, 'Delete', () => perform(editor.remove), 62);
  remove.TextColor3 = colors.danger;
  const viewport = scroll(parent, 'Property fields');
  viewport.Position = udim2FromOffset(12, 148);
  viewport.Size = udim2(1, -24, 1, -160);
  const content = panel('Fields', viewport);
  content.Size = udim2(1, -8, 0, 0);
  content.AutomaticSize = 'Y';
  stack(content, 8);
  const fields = createObservableValue<readonly PropertyRow[]>([]);
  const controls = new Map<Frame, TextInput | TextButton>();

  const commit = (item: PropertyRow, text: string): boolean => {
    try {
      const value = parseField(item.field, text, item.name);

      if (item.nodeId) {
        editor.edit(item.nodeId, item.name, value);
      } else {
        editor.configure({ [item.name]: value });
      }

      return true;
    } catch (error) {
      report(error instanceof Error ? error.message : String(error));
      return false;
    }
  };

  bindKeyedChildren(content, fields, {
    key: (item) => item.key,
    create: (item) => {
      const row = createFrame({
        Name: `${item.name} field`,
        Size: udim2(1, 0, 0, item.field.kind === 'udim2' ? 84 : 64),
        BackgroundTransparency: 1,
      });
      label(row, item.name, 22, 11, colors.muted);
      let control: TextInput | TextButton;

      if (item.field.kind === 'boolean' || item.field.kind === 'choice') {
        control = button(row, '', () => {
          const current = fields.get().find((field) => field.key === item.key)!;
          const choices = item.field.kind === 'boolean' ? ['false', 'true'] : item.field.choices!;
          const next = choices[(choices.indexOf(String(current.value)) + 1) % choices.length]!;
          commit(item, next);
        });
        control.AccessibleLabel = item.name;
        control.unsafeElement.title = 'Activate to cycle through values';
      } else {
        const editable = input(row, item.name, formatField(item.field, item.value));
        editable.unsafeElement.title = 'Press Enter or leave the field to apply';
        const apply = (): void => {
          const valid = commit(item, editable.Text);
          editable.unsafeElement.setAttribute('aria-invalid', String(!valid));

          if (valid) {
            const current = fields.get().find((field) => field.key === item.key);
            if (current) {
              editable.Text = formatField(current.field, current.value);
            }
          }
        };

        editable.on('blur', apply);
        editable.on('keydown', (event) => {
          if (event.key === 'Enter' && !event.isComposing) {
            event.preventDefault();
            apply();
          }

          if (event.key === 'Escape') {
            const current = fields.get().find((field) => field.key === item.key);
            if (current) {
              editable.Text = formatField(current.field, current.value);
              editable.unsafeElement.removeAttribute('aria-invalid');
            }
          }
        });
        control = editable;
      }

      control.Position = udim2FromOffset(0, 26);
      control.Size = udim2(1, 0, 0, 32);
      controls.set(row, control);
      row.onDestroy(() => controls.delete(row));

      if (item.field.kind === 'udim2') {
        const hint = label(row, 'x scale, x pixels, y scale, y pixels', 18, 9, colors.faint);
        hint.Position = udim2FromOffset(0, 60);
      }

      return row;
    },
    update: (row, item) => {
      const control = controls.get(row)!;

      if (control.unsafeElement !== document.activeElement) {
        control.Text = formatField(item.field, item.value);
        control.unsafeElement.removeAttribute('aria-invalid');
      }

      if (item.field.kind === 'boolean') {
        control.Text = item.value ? '✓  Enabled' : '○  Disabled';
        control.unsafeElement.setAttribute('aria-pressed', String(item.value));
      }
    },
  });

  watchOwnedValue(parent, editor.state, (snapshot) => {
    const selected = snapshot.document.nodes.find((node) => node.id === snapshot.selectedId);
    name.Text = selected?.properties.Name ?? snapshot.document.name;
    type.Text = selected
      ? `${selected.type} · ${selected.parent ? 'Nested object' : 'Canvas child'}`
      : 'Canvas · Enter or blur to apply';
    duplicate.Disabled = !selected || definitionFor(selected.type).category === 'modifier';
    duplicate.unsafeElement.title =
      duplicate.Disabled && selected
        ? 'Modifiers are unique within their parent.'
        : 'Duplicate the selected subtree';
    remove.Disabled = !selected;
    relocate.Disabled = !selected;

    if (selected) {
      fields.set(
        Object.entries(definitionFor(selected.type).fields).map(([name, field]) => ({
          key: `${selected.id}:${name}`,
          name,
          field,
          value: selected.properties[name]!,
          nodeId: selected.id,
        })),
      );
    } else {
      fields.set(
        Object.entries(documentFields).map(([name, field]) => ({
          key: `canvas:${name}`,
          name,
          field,
          value: snapshot.document[name as keyof typeof documentFields],
          nodeId: null,
        })),
      );
    }
  });
};
