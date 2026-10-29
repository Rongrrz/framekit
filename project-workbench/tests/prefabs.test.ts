import { color3FromHex, udim2 } from 'framekit';
import { describe, expect, it } from 'vitest';

import { createSampleDocument, parseDocument } from '../src/document';
import { createEditor } from '../src/editor';
import { expandScene } from '../src/expand-scene';
import { resolvedProperties } from '../src/prefabs';

describe('linked prefabs', () => {
  it('captures a scale-sized component relative to its authored ancestors', () => {
    const editor = createEditor();
    editor.edit('card', 'Size', udim2(1, -32, 1, -32));
    editor.edit('feature', 'Size', udim2(1, -80, 0, 164));
    editor.select('feature');
    const id = editor.createPrefab('Fluid feature');
    const prefab = editor.state.get().project.prefabs!.find((entry) => entry.id === id)!;
    expect({ width: prefab.width, height: prefab.height }).toEqual({ width: 848, height: 164 });
  });

  it('converts an owned group, places independent instances, edits the shared definition, and round trips it', () => {
    const editor = createEditor();
    editor.select('feature');
    const id = editor.createPrefab('Feature card');
    expect(editor.state.get().project.prefabs?.[0]?.nodes).toHaveLength(4);
    expect(editor.state.get().document.nodes.find((node) => node.id === 'feature')?.prefabId).toBe(
      id,
    );
    editor.select('card');
    editor.insertPrefab(id);
    const instance = editor.state.get().selectedId!;
    editor.openPrefab(id);
    editor.edit('feature-title', 'Text', 'Shared title');
    editor.edit('feature', 'BackgroundColor3', color3FromHex('#123456'));
    editor.openPrefab(null);
    const document = editor.state.get().project;
    const expanded = expandScene(document);
    expect(
      expanded.document.nodes.filter((node) => node.properties.Text === 'Shared title'),
    ).toHaveLength(2);
    expect(
      resolvedProperties(
        document,
        document.nodes.find((node) => node.id === instance)!,
      ).BackgroundColor3,
    ).toEqual(color3FromHex('#123456'));
    expect(parseDocument(JSON.stringify(document))).toEqual(document);
    expect(expanded.owners.get(`${instance}/@/feature-title`)).toBe(instance);
  });

  it('supports nested prefabs and rejects dependency cycles atomically', () => {
    const editor = createEditor();
    editor.select('feature');
    const child = editor.createPrefab('Child');
    editor.select('card');
    const parent = editor.createPrefab('Parent');
    editor.openPrefab(child);
    const before = editor.state.get();
    expect(() => editor.insertPrefab(parent)).toThrow('cycles');
    expect(editor.state.get()).toBe(before);
    editor.openPrefab(null);
    expect(
      expandScene(editor.state.get().project).document.nodes.some(
        (node) => node.properties.Text === 'A canvas with a memory.',
      ),
    ).toBe(true);
  });

  it('keeps prefab root overrides independent and undoes definition edits with the correct scope', () => {
    const editor = createEditor();
    editor.select('feature');
    const id = editor.createPrefab('Card');
    editor.edit('feature', 'BackgroundColor3', color3FromHex('#ffffff'));
    editor.openPrefab(id);
    editor.edit('feature', 'BackgroundColor3', color3FromHex('#000000'));
    editor.openPrefab(null);
    const instance = editor.state.get().document.nodes.find((node) => node.id === 'feature')!;
    expect(resolvedProperties(editor.state.get().project, instance).BackgroundColor3).toEqual(
      color3FromHex('#ffffff'),
    );
    editor.undo();
    expect(editor.state.get().prefabId).toBe(id);
    expect(editor.state.get().document.nodes[0]?.properties.BackgroundColor3).not.toEqual(
      color3FromHex('#000000'),
    );
  });

  it('rejects deletion of in-use definitions and clears a project replacement back to the scene', () => {
    const editor = createEditor();
    editor.select('feature');
    const id = editor.createPrefab('Card');
    expect(() => editor.removePrefab(id)).toThrow('instances');
    editor.openPrefab(id);
    editor.replace(createSampleDocument());
    expect(editor.state.get().prefabId).toBeNull();
    expect(editor.state.get().project.prefabs).toBeUndefined();
  });

  it('validates declared events and connections across nested output boundaries', () => {
    const editor = createEditor();
    editor.select('button');
    const id = editor.createPrefab('Action button');
    editor.openPrefab(id);
    editor.setEvents(['Pressed']);
    editor.connect({
      id: 'emit',
      source: 'button',
      event: 'Activated',
      action: { type: 'emit', event: 'Pressed' },
    });
    editor.openPrefab(null);
    editor.connect({
      id: 'respond',
      source: 'button',
      event: 'Pressed',
      action: { type: 'set', target: 'headline', property: 'Text', value: 'It works' },
    });
    const project = editor.state.get().project;
    expect(parseDocument(JSON.stringify(project))).toEqual(project);
    editor.openPrefab(id);
    expect(() => editor.setEvents([])).toThrow();
    expect(editor.state.get().document.events).toEqual(['Pressed']);
    editor.openPrefab(null);
    editor.select('headline');
    editor.remove();
    expect(editor.state.get().document.bindings).toEqual([]);
  });
});
