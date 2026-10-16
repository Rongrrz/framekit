import type { Frame } from '#elements/frame.js';
import { bindKeyedChildren } from '#helpers/keyed-children.js';
import type { Instance } from '#internal/runtime/node/instance.js';
import { createUICorner } from '#modifiers/corner.js';
import { createObservableValue } from '#state/value.js';
import { color3FromHex } from '#values/color3.js';
import { udim2, udim2FromOffset } from '#values/udim.js';

import { formatValue, propertyGroup } from './model.js';
import { inspectInstance } from './snapshot.js';
import { colors, createDebugUI } from './view.js';
import type { InspectorWorkspace } from './workspace.js';

/** Owns ancestor links and grouped property rows, including filtering and value formatting. */
export const bindInspectorDetails = (
  controls: InspectorWorkspace['details'],
  onSelect: (node: Instance) => void,
): ((selected: Instance, path: readonly Instance[], query: string) => void) => {
  const {
    breadcrumbs,
    properties: details,
    empty: propertyEmpty,
    name: selectedName,
    className: selectedClass,
    metricValues,
  } = controls;

  const ui = createDebugUI(details.unsafeElement.ownerDocument);
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

  const ancestors = createObservableValue<readonly Instance[]>([]);
  bindKeyedChildren(breadcrumbs, ancestors, {
    key,

    create: (node) => {
      const button = ui.button(undefined, '', {
        BackgroundTransparency: 1,
        TextColor3: colors.muted,
        TextSize: 10,
      });

      button.onClick(() => onSelect(node));

      return button;
    },

    update: (button, node) =>
      button.setProperties({
        Text: `${node.Name} ›`,
        AccessibleLabel: `Inspect ancestor ${node.Name}`,
        Size: udim2FromOffset(Math.min(132, node.Name.length * 6 + 18), 26),
      }),
  });
  type PropertyRow = Readonly<{
    key: string;
    name: string;
    value?: unknown;
    heading: boolean;
    animated: boolean;
  }>;

  const properties = createObservableValue<readonly PropertyRow[]>([]);

  const propertyViews = new Map<
    Frame,
    Readonly<{
      name: ReturnType<typeof ui.label>;
      value: ReturnType<typeof ui.label>;
      swatch: Frame;
    }>
  >();

  bindKeyedChildren(details, properties, {
    key: (row) => row.key,

    create: () => {
      const frame = ui.frame(undefined);

      const name = ui.label(frame, '', {
        Size: udim2(0.46, -8, 1, 0),
        TextSize: 11,
        TextColor3: colors.muted,
      });

      const value = ui.label(frame, '', {
        Position: udim2(0.46, 6, 0, 0),
        Size: udim2(0.54, -6, 1, 0),
        TextSize: 11,
        FontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
      });

      value.unsafeElement.dataset.debugValue = '';

      const swatch = ui.frame(frame, {
        Size: udim2FromOffset(10, 10),
        Position: udim2(0.46, -10, 0.5, -5),
      });

      createUICorner({ CornerRadius: 3 }).Parent = swatch;
      propertyViews.set(frame, { name, value, swatch });
      frame.onDestroy(() => propertyViews.delete(frame));

      return frame;
    },

    update: (frame, row) => {
      const view = propertyViews.get(frame)!;
      const formatted = formatValue(row.value);
      frame.Size = udim2(1, -4, 0, row.heading ? 38 : 30);
      frame.unsafeElement.setAttribute('role', row.heading ? 'heading' : 'group');
      frame.unsafeElement.setAttribute(
        'aria-label',
        row.heading ? row.name : `${row.name}: ${formatted.text}`,
      );

      if (row.heading) {
        frame.unsafeElement.setAttribute('aria-level', '3');
      } else {
        frame.unsafeElement.removeAttribute('aria-level');
      }

      view.name.setProperties({
        Text: row.name,
        FontWeight: row.heading ? 650 : 450,
        TextColor3: row.heading ? colors.ink : colors.muted,
        Size: udim2(row.heading ? 1 : 0.46, -8, 1, 0),
      });

      view.value.setProperties({
        Text: `${row.animated ? '● ' : ''}${formatted.text}`,
        Visible: !row.heading,
        TextColor3: row.animated ? colors.accent : colors.ink,
      });
      view.name.unsafeElement.title = row.name;
      view.value.unsafeElement.title = row.heading
        ? ''
        : (JSON.stringify(row.value) ?? String(row.value));

      view.swatch.setProperties({
        Visible: !row.heading && Boolean(formatted.swatch),
        BackgroundTransparency: formatted.swatch ? 0 : 1,
        BackgroundColor3: formatted.swatch ? color3FromHex(formatted.swatch) : colors.paper,
      });
    },
  });

  return (selected, path, query): void => {
    ancestors.set(path.slice(-3));
    selectedName.Text = selected.Name;
    selectedName.unsafeElement.title = selected.getFullName();

    const snapshot = inspectInstance(selected);
    selectedClass.Text = `Class: ${snapshot.className}`;
    metricValues[0]!.Text = String(snapshot.children.length);
    metricValues[1]!.Text = String(snapshot.cleanupRegistrations);
    metricValues[2]!.Text = String(snapshot.animatedProperties.length);

    const term = query.trim().toLowerCase();
    const groups = new Map<string, PropertyRow[]>();

    for (const [name, value] of Object.entries(snapshot.properties)) {
      if (term && !`${name} ${formatValue(value).text}`.toLowerCase().includes(term)) {
        continue;
      }

      const group = propertyGroup(name);
      const bucket = groups.get(group) ?? [];
      bucket.push({
        key: name,
        name,
        value,
        heading: false,
        animated: snapshot.animatedProperties.includes(name),
      });
      groups.set(group, bucket);
    }

    properties.set(
      [...groups].flatMap(([group, entries]) => [
        { key: `$${group}`, name: group, heading: true, animated: false },
        ...entries,
      ]),
    );
    propertyEmpty.Visible = groups.size === 0;
  };
};
