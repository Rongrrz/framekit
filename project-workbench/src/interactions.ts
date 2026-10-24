import type {
  Interaction,
  PrefabDefinition,
  SceneAction,
  SceneDocument,
  SceneNode,
} from './document';
import { definitionFor, validateField, type PropertyValue } from './schema';

/** Built-in triggers and declared prefab outputs share the same event-connection interface. */
export const eventsForNode = (
  node: SceneNode,
  definitions: ReadonlyMap<string, PrefabDefinition>,
): readonly string[] => [
  ...(node.type === 'TextButton' ? ['Activated'] : []),
  ...(node.type === 'TextInput' ? ['TextChanged', 'Submitted'] : []),
  ...(node.prefabId ? (definitions.get(node.prefabId)?.events ?? []) : []),
];

const record = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Expected an event connection object.');
  }

  return value as Record<string, unknown>;
};

/** Serialized connections contain data only; Preview never evaluates user JavaScript. */
export const parseBindings = (value: unknown): readonly Interaction[] => {
  if (!Array.isArray(value) || value.length > 500) {
    throw new TypeError('Use at most 500 event connections per scope.');
  }

  return value.map((entry: unknown) => {
    const item = record(entry);
    const action = record(item.action);

    if (
      typeof item.id !== 'string' ||
      !item.id ||
      typeof item.source !== 'string' ||
      typeof item.event !== 'string'
    ) {
      throw new TypeError('Connections need an ID, source object, and event.');
    }

    // The owning scope validates target properties and event names after parsing all definitions.
    let parsed: SceneAction;

    if (action.type === 'emit' && typeof action.event === 'string') {
      parsed = { type: 'emit', event: action.event };
    } else if (
      action.type === 'set' &&
      typeof action.target === 'string' &&
      typeof action.property === 'string' &&
      'value' in action
    ) {
      parsed = {
        type: 'set',
        target: action.target,
        property: action.property,
        value: action.value as PropertyValue,
      };
    } else if (
      action.type === 'toggle' &&
      typeof action.target === 'string' &&
      (action.property === 'Visible' || action.property === 'Disabled')
    ) {
      parsed = { type: 'toggle', target: action.target, property: action.property };
    } else if (
      action.type === 'increment' &&
      typeof action.target === 'string' &&
      typeof action.amount === 'number' &&
      Number.isFinite(action.amount)
    ) {
      parsed = { type: 'increment', target: action.target, amount: action.amount };
    } else if (
      action.type === 'copyText' &&
      typeof action.source === 'string' &&
      typeof action.target === 'string'
    ) {
      parsed = { type: 'copyText', source: action.source, target: action.target };
    } else {
      throw new TypeError('Unsupported event action.');
    }

    return { id: item.id, source: item.source, event: item.event, action: parsed };
  });
};

/** Invalid connections fail before a document revision or preview can change. */
export const validateBindings = (
  scope: Pick<SceneDocument, 'nodes' | 'events' | 'bindings'>,
  definitions: ReadonlyMap<string, PrefabDefinition>,
): void => {
  if ((scope.bindings?.length ?? 0) > 500) {
    throw new TypeError('Use at most 500 event connections per scope.');
  }

  const nodes = new Map(scope.nodes.map((node) => [node.id, node]));
  const ids = new Set<string>();

  for (const binding of scope.bindings ?? []) {
    const source = nodes.get(binding.source);

    if (
      ids.has(binding.id) ||
      !source ||
      !eventsForNode(source, definitions).includes(binding.event)
    ) {
      throw new TypeError('Event connections need unique IDs and a supported source event.');
    }

    ids.add(binding.id);
    const action = binding.action;

    if (action.type === 'emit') {
      if (!scope.events?.includes(action.event)) {
        throw new TypeError('Declare a custom event before emitting it.');
      }

      continue;
    }

    const target = nodes.get(action.target);

    if (!target) {
      throw new TypeError('An event target no longer exists.');
    }

    const fields = definitionFor(target.type).fields;

    if (action.type === 'set') {
      const field = fields[action.property];

      if (!field) {
        throw new TypeError('The event target does not support this property.');
      }

      validateField(field, action.value, action.property);
    } else if (action.type === 'toggle') {
      if (fields[action.property]?.kind !== 'boolean') {
        throw new TypeError('Only boolean properties can be toggled.');
      }
    } else if (
      fields.Text?.kind !== 'text' ||
      (action.type === 'copyText' &&
        definitionFor(nodes.get(action.source)?.type ?? 'Frame').fields.Text?.kind !== 'text')
    ) {
      throw new TypeError('Text actions need objects with a Text property.');
    }
  }
};

/** Clipboard operations preserve connections wholly owned by the copied branch. */
export const cloneInternalConnections = (
  bindings: readonly Interaction[],
  replacements: ReadonlyMap<string, string>,
): readonly Interaction[] =>
  bindings
    .filter((binding) => {
      const action = binding.action;
      return (
        replacements.has(binding.source) &&
        (action.type === 'emit' ||
          (replacements.has(action.target) &&
            (action.type !== 'copyText' || replacements.has(action.source))))
      );
    })
    .map((binding) => {
      const action = binding.action;
      const cloned =
        action.type === 'emit'
          ? action
          : action.type === 'copyText'
            ? {
                ...action,
                target: replacements.get(action.target)!,
                source: replacements.get(action.source)!,
              }
            : { ...action, target: replacements.get(action.target)! };
      return {
        ...binding,
        id: crypto.randomUUID(),
        source: replacements.get(binding.source)!,
        action: cloned,
      };
    });
