import {
  bindKeyedChildren,
  bindMenu,
  color3FromHex,
  createFrame,
  createTextArea,
  createUIPadding,
  createObservableValue,
  udim2,
  udim,
  udim2FromOffset,
  watchOwnedValue,
  type Frame,
  type TextInput,
  type TextArea,
} from 'framekit';

import type { Editor } from './editor';
import { definitionFor, formatField, parseField, type Field, type PropertyValue } from './schema';
import { button, colors, font, input, label, panel, round, scroll, stack } from './ui';

type PropertyRow = Readonly<{
  key: string;
  name: string;
  field: Field;
  value: PropertyValue;
  nodeId: string | null;
  section?: string;
}>;

const sections = {
  Object: ['Name', 'name', 'width', 'height'],
  Content: ['Text', 'PlaceholderText', 'Image', 'AltText', 'AccessibleLabel'],
  Layout: [
    'Position',
    'Size',
    'AnchorPoint',
    'Rotation',
    'AutomaticSize',
    'FillDirection',
    'Padding',
    'PaddingTop',
    'PaddingRight',
    'PaddingBottom',
    'PaddingLeft',
    'HorizontalAlignment',
    'VerticalAlignment',
    'Wraps',
  ],
  Appearance: [
    'BackgroundColor3',
    'BackgroundTransparency',
    'Visible',
    'Color',
    'Transparency',
    'Thickness',
    'CornerRadius',
    'Offset',
    'BlurRadius',
    'SpreadRadius',
    'Inset',
    'Enabled',
  ],
  Typography: [
    'TextSize',
    'TextColor3',
    'FontFamily',
    'FontWeight',
    'TextXAlignment',
    'TextYAlignment',
    'TextWrapped',
  ],
  Behavior: [
    'Disabled',
    'ClipsDescendants',
    'LayoutOrder',
    'ZIndex',
    'ScrollingDirection',
    'AutomaticCanvasSize',
    'SortOrder',
    'BorderStrokePosition',
    'ScaleType',
  ],
};

const titles: Readonly<Record<string, string>> = {
  BackgroundColor3: 'Fill',
  BackgroundTransparency: 'Transparency',
  AutomaticSize: 'Auto size',
  AnchorPoint: 'Anchor',
  TextColor3: 'Text color',
  TextSize: 'Font size',
  FontFamily: 'Font family',
  FontWeight: 'Weight',
  TextXAlignment: 'Horizontal align',
  TextYAlignment: 'Vertical align',
  TextWrapped: 'Wrap text',
  ClipsDescendants: 'Clip content',
  LayoutOrder: 'Layout order',
  ZIndex: 'Layer index',
  AccessibleLabel: 'Accessible label',
  PlaceholderText: 'Placeholder',
  CornerRadius: 'Radius',
  name: 'Name',
  width: 'Width',
  height: 'Height',
};

const documentFields = {
  name: { kind: 'text', value: '' },
  width: { kind: 'number', value: 960, min: 240, max: 4096 },
  height: { kind: 'number', value: 640, min: 240, max: 4096 },
} satisfies Record<string, Field>;

/** Controls retain native editing buffers; each complete field commits one reversible edit. */
export const createProperties = (
  parent: Frame,
  editor: Editor,
  move: () => void,
  report: (message: string) => void,
  perform: (action: () => void) => void,
): void => {
  const heading = label(parent, 'INSPECTOR', 32, 10, colors.muted);
  heading.Position = udim2FromOffset(20, 12);
  heading.LetterSpacing = 1.3;
  heading.FontWeight = 650;
  const canvasSettings = button(parent, 'Canvas', () => editor.select(null), 60);
  canvasSettings.AccessibleLabel = 'Canvas settings';
  canvasSettings.Position = udim2(1, -80, 0, 12);
  canvasSettings.Size = udim2FromOffset(60, 28);
  const name = label(parent, '', 28, 18);
  name.Position = udim2FromOffset(20, 54);
  name.Size = udim2(1, -40, 0, 28);
  name.FontWeight = 600;
  const type = label(parent, '', 22, 11, colors.muted);
  type.Position = udim2FromOffset(20, 84);
  type.Size = udim2(1, -40, 0, 22);
  const actions = panel('Selection actions', parent);
  actions.Position = udim2FromOffset(16, 118);
  actions.Size = udim2(1, -32, 0, 32);
  stack(actions, 6, true);
  const duplicate = button(actions, 'Duplicate', () => perform(editor.duplicate), 88);
  const relocate = button(actions, 'Move…', move, 68);
  const remove = button(actions, 'Delete', () => perform(editor.remove), 64);
  remove.TextColor3 = colors.danger;
  const viewport = scroll(parent, 'Property fields');
  viewport.Position = udim2FromOffset(20, 166);
  viewport.Size = udim2(1, -34, 1, -178);
  const content = panel('Fields', viewport);
  content.Size = udim2(1, -8, 0, 0);
  content.AutomaticSize = 'Y';
  stack(content, 8);
  const fields = createObservableValue<readonly PropertyRow[]>([]);
  const updates = new Map<Frame, (item: PropertyRow) => void>();

  const commit = (item: PropertyRow, text: string): boolean => {
    try {
      const current = fields.get().find((entry) => entry.key === item.key) ?? item;
      const value = parseField(current.field, text, current.name);

      if (current.nodeId) {
        editor.edit(current.nodeId, current.name, value);
      } else {
        editor.configure({ [current.name]: value });
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
      const top = item.section ? 32 : 0;
      const compact = item.field.kind === 'boolean' || item.field.kind === 'choice';
      const compound = ['udim2', 'udim', 'vector2'].includes(item.field.kind);
      const row = createFrame({
        Name: `${item.name} field`,
        Size: udim2(
          1,
          0,
          0,
          top + (compact ? 36 : compound ? 86 : item.name === 'Text' ? 112 : 66),
        ),
        BackgroundTransparency: 1,
      });

      if (item.section) {
        const title = label(row, item.section.toUpperCase(), 24, 10, colors.muted);
        title.FontWeight = 600;
        title.LetterSpacing = 1;
      }

      const title = label(row, titles[item.name] ?? item.name, compact ? 34 : 22, 12, colors.muted);
      title.Position = udim2FromOffset(0, top);
      title.unsafeElement.title = item.name;

      if (compact) {
        title.Size = udim2(0.45, 0, 0, 34);
        const control = button(row, '', () => {
          if (item.field.kind === 'boolean') {
            const current = fields.get().find((entry) => entry.key === item.key)!;
            commit(item, String(!current.value));
          }
        });
        control.AccessibleLabel = item.name;
        control.Position = udim2(0.48, 0, 0, top);
        control.Size = udim2(0.52, 0, 0, 34);

        if (item.field.kind === 'choice') {
          const choices = item.field.choices!;
          const menu = createFrame({
            Name: `${item.name} choices`,
            Size: udim2FromOffset(210, choices.length * 36 + 12),
            BackgroundColor3: colors.raised,
          });
          round(menu, 8, true);
          menu.Parent = row;
          const items = choices.map((choice, index) => {
            const option = button(
              menu,
              choice,
              () => {
                commit(item, choice);
              },
              198,
            );
            option.Position = udim2FromOffset(6, index * 36 + 6);
            return option;
          });
          bindMenu(control, menu, items);
        }

        updates.set(row, (current) => {
          control.Text =
            item.field.kind === 'boolean'
              ? current.value
                ? '●  On'
                : '○  Off'
              : `${current.value}  ⌄`;
          control.BackgroundColor3 =
            item.field.kind === 'boolean' && current.value ? colors.selected : colors.field;
          control.TextColor3 =
            item.field.kind === 'boolean' && current.value ? colors.accent : colors.text;

          if (item.field.kind === 'boolean') {
            control.unsafeElement.setAttribute('aria-pressed', String(current.value));
          }
        });
      } else {
        const names =
          item.field.kind === 'udim2'
            ? ['X scale', 'X offset', 'Y scale', 'Y offset']
            : item.field.kind === 'udim'
              ? ['Scale', 'Offset']
              : item.field.kind === 'vector2'
                ? ['X', 'Y']
                : [''];
        const inputs: (TextInput | TextArea)[] = names.map((part, index) => {
          const multiline = item.name === 'Text';
          const control = multiline
            ? createTextArea({
                Name: 'Text',
                AccessibleLabel: 'Text',
                ResizeDirection: 'None',
                BackgroundColor3: colors.field,
                TextColor3: colors.text,
                TextXAlignment: 'Left',
                TextYAlignment: 'Top',
                FontFamily: font,
                TextSize: 13,
                TextWrapped: true,
                LineHeight: 1.5,
              })
            : input(row, part ? `${item.name} ${part}` : item.name);

          if (multiline) {
            control.Parent = row;
            round(control, 6, true);
            createUIPadding({
              PaddingLeft: udim(0, 10),
              PaddingRight: udim(0, 10),
              PaddingTop: udim(0, 8),
              PaddingBottom: udim(0, 8),
            }).Parent = control;
            const hint = label(row, 'Ctrl/⌘ Enter to apply', 20, 9, colors.faint);
            hint.Position = udim2(1, -128, 0, top);
            hint.Size = udim2FromOffset(128, 20);
            hint.TextXAlignment = 'Right';
          }
          const count = names.length;
          control.Position = udim2(index / count, index ? 4 : 0, 0, top + (compound ? 46 : 28));
          control.Size = udim2(1 / count, count > 1 ? -5 : 0, 0, multiline ? 76 : 34);
          control.TextSize = multiline ? 13 : 12;

          if (compound) {
            const hint = label(row, part.replace('offset', 'px'), 18, 10, colors.faint);
            hint.Position = udim2(index / count, index ? 4 : 0, 0, top + 24);
            hint.Size = udim2(1 / count, -5, 0, 18);
            control.unsafeElement.inputMode = 'decimal';
          }

          control.unsafeElement.title = `${multiline ? 'Ctrl/Cmd Enter' : 'Enter'} or leave the field to apply · Escape to reset`;
          const apply = (): void => {
            const valid = commit(item, inputs.map((entry) => entry.Text).join(', '));
            control.unsafeElement.setAttribute('aria-invalid', String(!valid));
          };
          control.on('blur', apply);
          control.on('keydown', (event) => {
            if (
              event.key === 'Enter' &&
              !event.isComposing &&
              (!multiline || event.ctrlKey || event.metaKey)
            ) {
              event.preventDefault();
              apply();
            }

            if (event.key === 'Escape') {
              const current = fields.get().find((entry) => entry.key === item.key);

              if (current) {
                const parts = compound
                  ? formatField(current.field, current.value)
                      .split(',')
                      .map((part) => part.trim())
                  : [formatField(current.field, current.value)];
                inputs.forEach((entry, index) => {
                  entry.Text = parts[index]!;
                  entry.unsafeElement.removeAttribute('aria-invalid');
                });
              }
            }
          });
          return control;
        });
        const swatch = item.field.kind === 'color' ? panel('Color swatch', row) : undefined;

        if (swatch) {
          swatch.Position = udim2FromOffset(0, top + 29);
          swatch.Size = udim2FromOffset(32, 32);
          round(swatch, 6, true);
          inputs[0]!.Position = udim2FromOffset(42, top + 28);
          inputs[0]!.Size = udim2(1, -42, 0, 34);
        }

        updates.set(row, (current) => {
          const parts = compound
            ? formatField(current.field, current.value)
                .split(',')
                .map((part) => part.trim())
            : [formatField(current.field, current.value)];
          inputs.forEach((control, index) => {
            if (control.unsafeElement !== document.activeElement) {
              control.Text = parts[index]!;
              control.unsafeElement.removeAttribute('aria-invalid');
            }
          });

          if (swatch) {
            swatch.BackgroundColor3 = color3FromHex(formatField(current.field, current.value));
          }
        });
      }

      row.onDestroy(() => updates.delete(row));
      return row;
    },
    update: (row, item) => updates.get(row)!(item),
  });

  watchOwnedValue(parent, editor.state, (snapshot) => {
    const selected = snapshot.document.nodes.find((node) => node.id === snapshot.selectedId);
    name.Text = selected?.properties.Name ?? snapshot.document.name;
    type.Text = selected
      ? `${selected.type}  /  ${selected.parent ? 'Nested object' : 'Canvas child'}`
      : 'Canvas settings';
    duplicate.Disabled = !selected || definitionFor(selected.type).category === 'modifier';
    remove.Disabled = !selected;
    relocate.Disabled = !selected;
    const definitions: Readonly<Record<string, Field>> = selected
      ? definitionFor(selected.type).fields
      : documentFields;
    const values: Readonly<Record<string, PropertyValue>> = selected
      ? selected.properties
      : {
          name: snapshot.document.name,
          width: snapshot.document.width,
          height: snapshot.document.height,
        };
    const rows: PropertyRow[] = [];

    for (const [section, names] of Object.entries(sections)) {
      const present = names.filter((name) => Object.hasOwn(definitions, name));

      present.forEach((name, index) => {
        rows.push({
          key: `${selected?.id ?? 'canvas'}:${name}`,
          name,
          field: definitions[name]!,
          value: values[name]!,
          nodeId: selected?.id ?? null,
          ...(index === 0 ? { section } : {}),
        });
      });
    }

    fields.set(rows);
  });
};
