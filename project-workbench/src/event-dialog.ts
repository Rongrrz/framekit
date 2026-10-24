import {
  bindDialog,
  bindKeyedChildren,
  createFrame,
  createObservableValue,
  setAccessibility,
  udim2,
  udim2FromOffset,
  vector2,
  watchOwnedValue,
  type GuiElement,
  type ScreenGui,
} from 'framekit';

import type { Command } from './commands';
import type { Interaction, SceneAction, SceneNode } from './document';
import type { Editor } from './editor';
import { eventsForNode } from './interactions';
import { definitionFor, formatField, parseField } from './schema';
import { button, colors, input, label, panel, round, scroll } from './ui';

type ActionKind = SceneAction['type'];
const actionLabels: Readonly<Record<ActionKind, string>> = {
  emit: 'Emit custom event',
  set: 'Set property',
  toggle: 'Toggle property',
  increment: 'Increment text',
  copyText: 'Copy text',
};

/** Connections are edited as data, making the same behavior portable to generated code. */
export const createEventDialog = (
  app: ScreenGui,
  editor: Editor,
  choose: (title: string, commands: readonly Command[], opener: GuiElement) => void,
  perform: (action: () => void) => void,
): Readonly<{ open(opener?: GuiElement): void; close(): void }> => {
  const execute = (action: () => void): void =>
    perform(() => {
      try {
        action();
      } catch (error) {
        feedback.Text = error instanceof Error ? error.message : String(error);
        feedback.TextColor3 = colors.danger;
        throw error;
      }
    });
  const dialog = createFrame({
    TagName: 'dialog',
    Name: 'Event connections',
    BackgroundColor3: colors.panel,
    Position: udim2(0.5, 0, 0.5, 0),
    AnchorPoint: vector2(0.5, 0.5),
    ClipsDescendants: true,
  });
  dialog.Parent = app;
  round(dialog, 12, true);
  setAccessibility(dialog, { label: 'Event connections' });
  const heading = label(dialog, 'Events & connections', 40, 22);
  heading.Position = udim2FromOffset(24, 14);
  heading.Size = udim2(1, -84, 0, 40);
  const subtitle = label(dialog, '', 26, 12, colors.muted);
  subtitle.Position = udim2FromOffset(24, 58);
  subtitle.Size = udim2(1, -48, 0, 26);
  const close = button(dialog, '×', () => modal.close(), 32);
  close.AccessibleLabel = 'Close events';
  close.Position = udim2(1, -48, 0, 20);
  const viewport = scroll(dialog, 'Event editor');
  viewport.Position = udim2FromOffset(16, 94);
  viewport.Size = udim2(1, -32, 1, -110);
  const content = panel('Event form', viewport);
  content.Size = udim2(1, -6, 0, 1020);
  const customTitle = label(content, 'CUSTOM OUTPUT EVENTS', 28, 10, colors.muted);
  customTitle.LetterSpacing = 1;
  const eventName = input(content, 'Custom event name');
  eventName.PlaceholderText = 'e.g. Confirmed, Changed, Closed';
  eventName.Position = udim2FromOffset(0, 36);
  eventName.Size = udim2(1, -90, 0, 34);
  const addEvent = button(
    content,
    '+ Add',
    () =>
      execute(() => {
        editor.setEvents([...(editor.state.get().document.events ?? []), eventName.Text.trim()]);
        eventName.Text = '';
      }),
    80,
  );
  addEvent.Position = udim2(1, -80, 0, 36);
  const outputs = scroll(content, 'Declared custom events');
  outputs.Position = udim2FromOffset(0, 80);
  outputs.Size = udim2(1, 0, 0, 72);
  const eventSource = createObservableValue<readonly string[]>([]);
  const emptyOutputs = label(
    outputs,
    'Declare outputs here; emit them from an internal object or a nested prefab.',
    46,
    11,
    colors.muted,
  );
  emptyOutputs.TextWrapped = true;
  bindKeyedChildren(outputs, eventSource, {
    key: (name) => name,
    create: (name) => {
      const row = button(outputs, '', () =>
        execute(() =>
          editor.setEvents(
            (editor.state.get().document.events ?? []).filter((event) => event !== name),
          ),
        ),
      );
      row.Parent = undefined;
      row.AccessibleLabel = `Remove event ${name}`;
      row.TextXAlignment = 'Left';
      return row;
    },
    update: (row, name, index) => {
      row.Text = `  ${name}    ×`;
      row.Position = udim2FromOffset(0, index * 36);
      row.Size = udim2(1, -6, 0, 32);
    },
  });
  const connectionsTitle = label(content, 'CONNECTIONS', 28, 10, colors.muted);
  connectionsTitle.Position = udim2FromOffset(0, 164);
  connectionsTitle.LetterSpacing = 1;
  const newConnection = button(content, '+ New connection', () => load(), 150);
  newConnection.Position = udim2(1, -150, 0, 164);
  const connections = scroll(content, 'Saved connections');
  connections.Position = udim2FromOffset(0, 206);
  connections.Size = udim2(1, 0, 0, 132);
  const connectionSource = createObservableValue<readonly Interaction[]>([]);
  const emptyConnections = label(
    connections,
    'No connections yet. Choose a trigger and an action below.',
    48,
    12,
    colors.muted,
  );
  emptyConnections.TextWrapped = true;
  bindKeyedChildren(connections, connectionSource, {
    key: (binding) => binding.id,
    create: (binding) => {
      const row = button(connections, '', () =>
        load(editor.state.get().document.bindings?.find((entry) => entry.id === binding.id)),
      );
      row.Parent = undefined;
      row.TextXAlignment = 'Left';
      return row;
    },
    update: (row, binding, index) => {
      const node = editor.state.get().document.nodes.find((node) => node.id === binding.source);
      row.Text = `  ${node?.properties.Name ?? 'Object'} · ${binding.event} → ${actionLabels[binding.action.type]}`;
      row.AccessibleLabel = `Edit connection ${node?.properties.Name ?? 'Object'} ${binding.event}`;
      row.Position = udim2FromOffset(0, index * 40);
      row.Size = udim2(1, -6, 0, 36);
    },
  });

  let editingId: string | undefined;
  let sourceId: string | undefined;
  let triggerEvent = '';
  let kind: ActionKind = 'set';
  let targetId: string | undefined;
  let property = 'Text';
  let emitted = '';
  let copyId: string | undefined;
  const field = (title: string, y: number): void => {
    const text = label(content, title, 24, 11, colors.muted);
    text.Position = udim2FromOffset(0, y);
  };
  field('When this object…', 354);
  const source = button(content, 'Choose source', () =>
    chooseNodes(
      'Choose event source',
      (node) => availableEvents(node).length > 0,
      source,
      (id) => {
        sourceId = id;
        triggerEvent = availableEvents(currentNodes().find((node) => node.id === id)!)[0] ?? '';
        refresh();
      },
    ),
  );
  source.AccessibleLabel = 'Event source';
  source.Position = udim2FromOffset(0, 384);
  source.Size = udim2(0.6, -6, 0, 36);
  const event = button(content, 'Choose event', () => {
    const node = currentNodes().find((node) => node.id === sourceId);
    choose(
      'Choose trigger event',
      (node ? availableEvents(node) : []).map((name) => ({
        id: name,
        label: name,
        hint: 'Event',
        run: () => {
          triggerEvent = name;
          refresh();
        },
      })),
      event,
    );
  });
  event.AccessibleLabel = 'Trigger event';
  event.Position = udim2(0.6, 6, 0, 384);
  event.Size = udim2(0.4, -6, 0, 36);
  field('Do this…', 436);
  const action = button(content, 'Set property', () =>
    choose(
      'Choose action',
      (Object.keys(actionLabels) as ActionKind[]).map((type) => ({
        id: type,
        label: actionLabels[type],
        hint: type === 'emit' ? 'Publish a custom output' : 'Change an object',
        run: () => {
          kind = type;
          refresh();
        },
      })),
      action,
    ),
  );
  action.AccessibleLabel = 'Connection action';
  action.Position = udim2FromOffset(0, 466);
  action.Size = udim2(1, 0, 0, 36);
  field('Target or custom output', 518);
  const target = button(content, 'Choose target', () => {
    if (kind === 'emit') {
      choose(
        'Choose custom output',
        (editor.state.get().document.events ?? []).map((name) => ({
          id: name,
          label: name,
          hint: 'Custom event',
          run: () => {
            emitted = name;
            refresh();
          },
        })),
        target,
      );
    } else {
      chooseNodes(
        'Choose action target',
        (node) =>
          kind === 'increment' || kind === 'copyText'
            ? Boolean(definitionFor(node.type).fields.Text)
            : definitionFor(node.type).category !== 'modifier',
        target,
        (id) => {
          targetId = id;
          property = 'Text';
          refresh();
        },
      );
    }
  });
  target.AccessibleLabel = 'Connection target';
  target.Position = udim2FromOffset(0, 548);
  target.Size = udim2(1, 0, 0, 36);
  field('Property / text source', 600);
  const propertyControl = button(content, 'Text', () => {
    if (kind === 'copyText') {
      chooseNodes(
        'Copy text from',
        (node) => Boolean(definitionFor(node.type).fields.Text),
        propertyControl,
        (id) => {
          copyId = id;
          refresh();
        },
      );
      return;
    }

    const node = currentNodes().find((node) => node.id === targetId);
    const fields = node ? definitionFor(node.type).fields : {};
    choose(
      'Choose target property',
      Object.entries(fields)
        .filter(
          ([name, field]) =>
            kind !== 'toggle' ||
            (field.kind === 'boolean' && (name === 'Visible' || name === 'Disabled')),
        )
        .map(([name, field]) => ({
          id: name,
          label: name,
          hint: field.kind,
          run: () => {
            property = name;
            value.Text = formatField(field, field.value);
            refresh();
          },
        })),
      propertyControl,
    );
  });
  propertyControl.AccessibleLabel = 'Connection property';
  propertyControl.Position = udim2FromOffset(0, 630);
  propertyControl.Size = udim2(1, 0, 0, 36);
  field('Value / increment amount', 682);
  const value = input(content, 'Connection value');
  value.Position = udim2FromOffset(0, 712);
  value.Size = udim2(1, 0, 0, 36);
  const help = label(
    content,
    'Use comma-separated values for positions and sizes. Colors use #RRGGBB. Test connections in Preview.',
    58,
    11,
    colors.muted,
  );
  help.Position = udim2FromOffset(0, 758);
  help.Size = udim2(1, 0, 0, 58);
  help.TextWrapped = true;
  const save = button(
    content,
    'Save connection',
    () =>
      execute(() => {
        if (!sourceId || !triggerEvent) {
          throw new TypeError('Choose an object with an event first.');
        }

        let action: SceneAction;

        if (kind === 'emit') {
          action = { type: kind, event: emitted };
        } else {
          const node = currentNodes().find((node) => node.id === targetId);

          if (!node) {
            throw new TypeError('Choose an action target.');
          }

          if (kind === 'set') {
            const field = definitionFor(node.type).fields[property];

            if (!field) {
              throw new TypeError('Choose a target property.');
            }

            action = {
              type: kind,
              target: node.id,
              property,
              value: parseField(field, value.Text, property),
            };
          } else if (kind === 'toggle') {
            if (property !== 'Visible' && property !== 'Disabled') {
              throw new TypeError('Choose Visible or Disabled for a toggle.');
            }

            action = { type: kind, target: node.id, property };
          } else if (kind === 'increment') {
            if (!value.Text.trim() || !Number.isFinite(Number(value.Text))) {
              throw new TypeError('Enter a finite increment amount.');
            }

            action = { type: kind, target: node.id, amount: Number(value.Text) };
          } else {
            action = { type: kind, target: node.id, source: copyId ?? '' };
          }
        }

        const binding = {
          id: editingId ?? crypto.randomUUID(),
          source: sourceId,
          event: triggerEvent,
          action,
        };
        editor.connect(binding);
        editingId = binding.id;
        refresh();
      }),
    160,
  );
  save.Position = udim2FromOffset(0, 836);
  save.Size = udim2(0.5, -6, 0, 32);
  save.BackgroundColor3 = colors.accent;
  save.TextColor3 = colors.canvas;
  const remove = button(
    content,
    'Delete connection',
    () =>
      execute(() => {
        if (editingId) {
          editor.disconnect(editingId);
          load();
        }
      }),
    160,
  );
  remove.Position = udim2(0.5, 6, 0, 836);
  remove.Size = udim2(0.5, -6, 0, 32);
  remove.TextColor3 = colors.danger;
  const feedback = label(content, '', 64, 12, colors.muted);
  feedback.Position = udim2FromOffset(0, 888);
  feedback.Size = udim2(1, 0, 0, 64);
  feedback.TextWrapped = true;
  const modal = bindDialog(dialog, { initialFocus: source });
  const currentNodes = (): readonly SceneNode[] => editor.state.get().document.nodes;
  const availableEvents = (node: SceneNode): readonly string[] =>
    eventsForNode(
      node,
      new Map((editor.state.get().project.prefabs ?? []).map((prefab) => [prefab.id, prefab])),
    );
  const chooseNodes = (
    title: string,
    filter: (node: SceneNode) => boolean,
    opener: GuiElement,
    run: (id: string) => void,
  ): void => {
    choose(
      title,
      currentNodes()
        .filter(filter)
        .map((node) => ({
          id: node.id,
          label: node.properties.Name,
          hint: node.prefabId ? 'Prefab instance' : node.type,
          run: () => run(node.id),
        })),
      opener,
    );
  };
  const refresh = (): void => {
    const nodes = currentNodes();
    const from = nodes.find((node) => node.id === sourceId);
    const to = nodes.find((node) => node.id === targetId);
    const fields = to ? definitionFor(to.type).fields : {};

    if (!fields[property] || (kind === 'toggle' && fields[property]?.kind !== 'boolean')) {
      property = kind === 'toggle' ? 'Visible' : fields.Text ? 'Text' : 'Rotation';
    }

    source.Text = from?.properties.Name ?? 'Choose source';
    event.Text = triggerEvent || 'Choose event';
    action.Text = actionLabels[kind];
    target.Text =
      kind === 'emit'
        ? emitted || 'Choose custom output'
        : (to?.properties.Name ?? 'Choose target');
    propertyControl.Text =
      kind === 'copyText'
        ? (nodes.find((node) => node.id === copyId)?.properties.Name ?? 'Choose text source')
        : property;
    propertyControl.Disabled = kind === 'emit' || kind === 'increment';
    value.Disabled = kind !== 'set' && kind !== 'increment';
    remove.Disabled = !editingId;
    subtitle.Text = `${editor.state.get().prefabId ? 'Prefab' : 'Hierarchy'} · ${editor.state.get().document.name}`;
    eventSource.set(editor.state.get().document.events ?? []);
    connectionSource.set(editor.state.get().document.bindings ?? []);
    emptyOutputs.Visible = eventSource.get().length === 0;
    emptyConnections.Visible = connectionSource.get().length === 0;
    feedback.TextColor3 = colors.muted;
    feedback.Text = editingId
      ? 'Connection saved. Changes are included in project undo and autosave.'
      : 'Save this connection, then switch to Preview to try it.';
  };
  const load = (binding?: Interaction): void => {
    const selected = currentNodes().find((node) => node.id === editor.state.get().selectedId);
    const action = binding?.action;
    editingId = binding?.id;
    sourceId =
      binding?.source ??
      (selected && availableEvents(selected).length
        ? selected.id
        : currentNodes().find((node) => availableEvents(node).length)?.id);
    const from = currentNodes().find((node) => node.id === sourceId);
    triggerEvent = binding?.event ?? (from ? availableEvents(from)[0] : '') ?? '';
    kind = action?.type ?? 'set';
    targetId =
      action && action.type !== 'emit'
        ? action.target
        : currentNodes().find((node) => definitionFor(node.type).fields.Text)?.id;
    property = action?.type === 'set' || action?.type === 'toggle' ? action.property : 'Text';
    emitted =
      action?.type === 'emit' ? action.event : (editor.state.get().document.events?.[0] ?? '');
    copyId =
      action?.type === 'copyText'
        ? action.source
        : currentNodes().find((node) => node.type === 'TextInput')?.id;
    const target = currentNodes().find((node) => node.id === targetId);
    const field = target ? definitionFor(target.type).fields[property] : undefined;
    value.Text =
      action?.type === 'set' && field
        ? formatField(field, action.value)
        : action?.type === 'increment'
          ? String(action.amount)
          : '1';
    refresh();
  };

  watchOwnedValue(dialog, editor.state, () => {
    if (dialog.unsafeElement.hasAttribute('open')) {
      refresh();
    }
  });
  return {
    close: (): void => modal.close(),
    open: (opener): void => {
      heading.TextSize = window.innerWidth < 480 ? 20 : 22;
      dialog.Size = udim2FromOffset(
        Math.min(680, window.innerWidth - 24),
        Math.min(780, window.innerHeight - 32),
      );
      viewport.CanvasPosition = vector2(0, 0);
      load();
      modal.open(opener);
    },
  };
};
