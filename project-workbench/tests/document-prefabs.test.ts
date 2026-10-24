import { describe, expect, it } from 'vitest';

import {
  createSampleDocument,
  parseDocument,
  type PrefabDefinition,
  type SceneDocument,
} from '../src/document';
import { defaultProperties } from '../src/schema';

const component = (id: string, nested?: string): PrefabDefinition => ({
  id,
  name: id,
  width: 320,
  height: 180,
  nodes: [
    { id: 'root', type: 'Frame', parent: null, properties: defaultProperties('Frame') },
    {
      id: 'button',
      type: 'TextButton',
      parent: 'root',
      properties: defaultProperties('TextButton'),
    },
    ...(nested
      ? [
          {
            id: 'nested',
            type: 'Frame' as const,
            parent: 'root',
            prefabId: nested,
            properties: { Name: 'Nested component' },
          },
        ]
      : []),
  ],
  events: ['Pressed'],
  bindings: [
    {
      id: 'pressed',
      source: 'button',
      event: 'Activated',
      action: { type: 'emit', event: 'Pressed' },
    },
  ],
});

const document = (...prefabs: readonly PrefabDefinition[]): SceneDocument => ({
  ...createSampleDocument(),
  prefabs,
  nodes: [
    {
      id: 'placed',
      type: 'Frame',
      parent: null,
      prefabId: prefabs[0]!.id,
      properties: { Name: 'Placed component' },
    },
  ],
});

describe('prefab document boundary', () => {
  it('round trips definitions, nested references, sparse overrides, and custom event connections', () => {
    const project = document(component('parent', 'child'), component('child'));
    expect(parseDocument(JSON.stringify(project))).toEqual(project);
  });

  it('rejects missing definitions, recursive dependencies, invalid roots, and mismatched root types', () => {
    const base = component('base');
    for (const value of [
      document(component('base', 'missing')),
      document(component('first', 'second'), component('second', 'first')),
      document({ ...base, nodes: [] }),
      { ...document(base), nodes: [{ ...document(base).nodes[0]!, type: 'TextButton' }] },
    ]) {
      expect(() => parseDocument(JSON.stringify(value))).toThrow();
    }
  });

  it('rejects orphaned triggers, undeclared outputs, invalid properties, and nonfinite actions', () => {
    const base = component('base');
    const actions = [
      { type: 'emit', event: 'Undeclared' },
      { type: 'set', target: 'button', property: 'Unsupported', value: 1 },
      { type: 'set', target: 'missing', property: 'Text', value: 'No target' },
      { type: 'increment', target: 'button', amount: null },
    ];
    for (const action of actions) {
      const value = {
        ...document(base),
        prefabs: [
          {
            ...base,
            bindings: [{ id: 'connection', source: 'button', event: 'Activated', action }],
          },
        ],
      };
      expect(() => parseDocument(JSON.stringify(value))).toThrow();
    }
    expect(() =>
      parseDocument(JSON.stringify(document({ ...base, events: ['Activated'] }))),
    ).toThrow();
  });
});
