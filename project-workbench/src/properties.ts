import {
  bindKeyedChildren,
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

import { createDropdown } from './dropdown';
import type { Editor } from './editor';
import { setIcon } from './icons/ai-decorations';
import { resolvedProperties } from './prefabs';
import { definitionFor, formatField, parseField, type Field, type PropertyValue } from './schema';
import {
  button,
  colors,
  font,
  iconButton,
  input,
  label,
  panel,
  round,
  scroll,
  setToggle,
  stack,
} from './ui';

type PropertyRow = Readonly<{
  key: string;
  name: string;
  field: Field;
  value: PropertyValue;
  nodeId: string | null;
  section: string;
  first: boolean;
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
    'BorderStrokeSide',
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
  BorderStrokePosition: 'Stroke position',
  BorderStrokeSide: 'Stroke edge',
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
  report: (message: string) => void,
  editScript: () => void,
): void => {
  const heading = label(parent, 'Inspector', 32, 13, colors.muted);
  heading.Position = udim2FromOffset(16, 8);
  heading.FontWeight = 650;
  const resetLayout = iconButton(parent, 'undo', 'Reset device overrides', () =>
    editor.resetLayout(),
  );
  resetLayout.Position = udim2(1, -80, 0, 8);
  resetLayout.unsafeElement.title = 'Reset this layer to shared styles for this device';
  const canvasSettings = iconButton(parent, 'canvas', 'Project settings', () =>
    editor.select(null),
  );
  canvasSettings.Position = udim2(1, -44, 0, 8);
  const name = label(parent, '', 24, 16);
  name.Position = udim2FromOffset(16, 48);
  name.Size = udim2(1, -40, 0, 28);
  name.FontWeight = 600;
  name.ClipsDescendants = true;
  const type = label(parent, '', 22, 11, colors.muted);
  type.Position = udim2FromOffset(16, 74);
  type.Size = udim2(1, -40, 0, 22);
  const scriptButton = button(parent, 'Edit script', editScript, 100);
  scriptButton.Position = udim2(1, -116, 0, 70);
  scriptButton.Size = udim2FromOffset(100, 28);
  scriptButton.Visible = false;
  const viewport = scroll(parent, 'Property fields');
  viewport.Position = udim2FromOffset(16, 104);
  viewport.Size = udim2(1, -28, 1, -116);
  const content = panel('Fields', viewport);
  content.Size = udim2(1, -8, 0, 0);
  content.AutomaticSize = 'Y';
  stack(content, 4);
  const fields = createObservableValue<readonly PropertyRow[]>([]);
  const updates = new Map<Frame, (item: PropertyRow) => void>();
  const collapsed = new Set<string>();

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
      const headerHeight = item.first ? 36 : 0;
      const top = 0;
      const compact = item.field.kind === 'boolean' || item.field.kind === 'choice';
      const compound = ['udim2', 'udim', 'vector2'].includes(item.field.kind);
      const row = createFrame({
        Name: `${item.name} field`,
        Size: udim2(1, 0, 0, headerHeight + (compound ? 68 : item.name === 'Text' ? 94 : 30)),
        BackgroundTransparency: 1,
      });

      const header = item.first
        ? button(row, item.section, () => {
            if (collapsed.has(item.section)) {
              collapsed.delete(item.section);
            } else {
              collapsed.add(item.section);
            }

            fields.set([...fields.get()]);
          })
        : undefined;

      if (header) {
        header.Size = udim2(1, 0, 0, 28);
        header.BackgroundTransparency = 1;
        header.TextSize = 12;
        header.FontWeight = 600;
        header.AccessibleLabel = `${item.section} section`;
      }

      const fieldContent = panel('Property control', row);
      fieldContent.BackgroundTransparency = 1;
      fieldContent.Position = udim2FromOffset(0, headerHeight);
      fieldContent.Size = udim2(1, 0, 0, compound ? 68 : item.name === 'Text' ? 94 : 30);

      const title = label(fieldContent, titles[item.name] ?? item.name, 28, 11, colors.muted);
      title.Position = udim2FromOffset(0, top);
      if (!compound && item.name !== 'Text') {
        title.Size = udim2(0.36, -6, 0, 28);
      }
      title.unsafeElement.title = item.name;

      if (compact) {
        title.Size = udim2(0.45, 0, 0, 28);
        const dropdown =
          item.field.kind === 'choice'
            ? createDropdown(fieldContent, {
                label: item.name,
                width: 210,
                choices: item.field.choices!.map((value) => ({ value, label: value })),
                value: () =>
                  String(fields.get().find((entry) => entry.key === item.key)?.value ?? item.value),
                change: (value) => {
                  commit(item, value);
                },
              })
            : undefined;
        const control =
          dropdown?.control ??
          button(fieldContent, '', () => {
            if (item.field.kind === 'boolean') {
              const current = fields.get().find((entry) => entry.key === item.key)!;
              commit(item, String(!current.value));
            }
          });
        control.AccessibleLabel = item.name;
        control.Position = udim2(0.48, 0, 0, top);
        control.Size = udim2(0.52, 0, 0, 28);

        if (item.field.kind === 'boolean') {
          control.Position = udim2(1, -76, 0, top);
          control.Size = udim2FromOffset(76, 28);
        }

        updates.set(row, (current) => {
          if (item.field.kind === 'boolean') {
            setToggle(control, Boolean(current.value));
          } else {
            dropdown!.refresh();
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
            : input(fieldContent, part ? `${item.name} ${part}` : item.name);

          if (multiline) {
            control.Parent = fieldContent;
            round(control, 6, true);
            createUIPadding({
              PaddingLeft: udim(0, 10),
              PaddingRight: udim(0, 10),
              PaddingTop: udim(0, 8),
              PaddingBottom: udim(0, 8),
            }).Parent = control;
          }
          const count = names.length;
          control.Position =
            compound || multiline
              ? udim2(index / count, index ? 4 : 0, 0, top + (compound ? 36 : 24))
              : udim2(0.36, 0, 0, top);
          control.Size =
            compound || multiline
              ? udim2(1 / count, count > 1 ? -5 : 0, 0, multiline ? 64 : 28)
              : udim2(0.64, 0, 0, 28);
          control.TextSize = multiline ? 13 : 12;

          if (compound) {
            const hint = label(fieldContent, part.replace('offset', 'px'), 18, 10, colors.faint);
            hint.Position = udim2(index / count, index ? 4 : 0, 0, top + 18);
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
        const swatch =
          item.field.kind === 'color' ? panel('Color swatch', fieldContent) : undefined;

        if (swatch) {
          swatch.Position = udim2(0.36, 0, 0, top + 2);
          swatch.Size = udim2FromOffset(24, 24);
          round(swatch, 6, true);
          inputs[0]!.Position = udim2(0.36, 32, 0, top);
          inputs[0]!.Size = udim2(0.64, -32, 0, 28);
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

      const updateControl = updates.get(row)!;
      updates.set(row, (current) => {
        const expanded = !collapsed.has(current.section);
        row.Visible = current.first || expanded;
        row.Size = udim2(1, 0, 0, headerHeight + (expanded ? fieldContent.Size.Y.Offset : 0));
        fieldContent.Visible = expanded;

        if (header) {
          header.unsafeElement.setAttribute('aria-expanded', String(expanded));
          setIcon(header, expanded ? 'chevron_down' : 'chevron_right');
        }

        updateControl(current);
      });
      row.onDestroy(() => updates.delete(row));
      return row;
    },
    update: (row, item) => updates.get(row)!(item),
  });

  watchOwnedValue(parent, editor.state, (snapshot) => {
    const selected = snapshot.document.nodes.find((node) => node.id === snapshot.selectedId);
    resetLayout.Visible = Boolean(
      selected && snapshot.layout && selected.responsive?.[snapshot.layout],
    );
    name.Text = selected?.properties.Name ?? snapshot.document.name;
    type.Text = selected
      ? `${snapshot.layout ? `${snapshot.layout} layout · ` : ''}${selected.prefabId ? 'Prefab instance' : selected.type}  /  ${selected.parent ? 'Nested object' : 'Canvas child'}`
      : snapshot.prefabId
        ? 'Prefab dimensions'
        : 'Responsive website';
    const definitions: Readonly<Record<string, Field>> = selected
      ? definitionFor(selected.type).fields
      : snapshot.prefabId
        ? documentFields
        : { name: documentFields.name };
    const values: Readonly<Record<string, PropertyValue>> = selected
      ? resolvedProperties(snapshot.document, selected, snapshot.layout)
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
          field:
            !selected && snapshot.prefabId && (name === 'width' || name === 'height')
              ? { ...definitions[name]!, min: 4 }
              : definitions[name]!,
          value: values[name]!,
          nodeId: selected?.id ?? null,
          section,
          first: index === 0,
        });
      });
    }

    scriptButton.Visible = selected?.type === 'Script';
    fields.set(rows);
  });
};
