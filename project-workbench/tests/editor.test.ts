import { describe, expect, it } from 'vitest';

import { createSampleDocument, parseDocument } from '../src/document';
import { createEditor } from '../src/editor';
import { exportTypeScript } from '../src/export';
import { defaultProperties, nodeDefinitions, parseField } from '../src/schema';

describe('Workbench documents', () => {
  it('round trips the sample and every editable node type', () => {
    const sample = createSampleDocument();
    expect(parseDocument(JSON.stringify(sample))).toEqual(sample);

    for (const type of Object.keys(nodeDefinitions) as (keyof typeof nodeDefinitions)[]) {
      const editor = createEditor();
      editor.add('Frame');
      editor.add(type);
      expect(parseDocument(JSON.stringify(editor.state.get().document))).toEqual(
        editor.state.get().document,
      );
    }
  });

  it('rejects unsupported versions, properties, types, unsafe images, cycles, and invalid parents', () => {
    const sample = createSampleDocument();
    const first = sample.nodes[0]!;
    const documents = [
      { ...sample, version: 2 },
      { ...sample, width: 0 },
      { ...sample, nodes: [first, first] },
      { ...sample, nodes: [{ ...first, type: 'constructor' }] },
      { ...sample, nodes: [{ ...first, properties: { Unknown: 1 } }] },
      { ...sample, nodes: [{ ...first, properties: { BackgroundTransparency: 2 } }] },
      { ...sample, nodes: [{ ...first, parent: first.id }] },
      { ...sample, nodes: [{ ...first, parent: 'missing' }] },
      {
        ...sample,
        nodes: [{ ...first, type: 'ImageLabel', properties: { Image: 'javascript:alert(1)' } }],
      },
      {
        ...sample,
        nodes: [
          first,
          {
            id: 'input',
            type: 'TextInput',
            parent: null,
            properties: defaultProperties('TextInput'),
          },
          { ...first, id: 'child', parent: 'input' },
        ],
      },
    ];

    for (const document of documents) {
      expect(() => parseDocument(JSON.stringify(document))).toThrow();
    }
  });

  it('retains the current document and history after a failed import or edit', () => {
    const editor = createEditor();
    const original = editor.state.get();
    expect(() => editor.load('{')).toThrow();
    expect(() => editor.edit('card', 'Rotation', Number.NaN)).toThrow();
    expect(() => editor.reparent('card', 'feature')).toThrow();
    expect(editor.state.get()).toBe(original);
  });

  it('accepts fifty ownership levels and rejects the next level', () => {
    const nodes = Array.from({ length: 51 }, (_, index) => ({
      id: String(index),
      type: 'Frame',
      parent: index ? String(index - 1) : null,
      properties: defaultProperties('Frame'),
    }));
    const document = { ...createSampleDocument(), nodes: nodes.slice(0, 50) };
    expect(parseDocument(JSON.stringify(document)).nodes).toHaveLength(50);
    expect(() => parseDocument(JSON.stringify({ ...document, nodes }))).toThrow('50 levels');
  });

  it('duplicates entire subtrees with unique ownership, then undoes and redoes deletion', () => {
    const editor = createEditor();
    editor.select('feature');
    editor.duplicate();
    const copy = editor.state.get();
    const duplicate = copy.document.nodes.find((node) => node.id === copy.selectedId)!;
    expect(duplicate.properties.Name).toBe('Feature panel copy');
    expect(copy.document.nodes.filter((node) => node.parent === duplicate.id)).toHaveLength(3);
    expect(parseDocument(JSON.stringify(copy.document))).toEqual(copy.document);

    editor.remove();
    expect(editor.state.get().document.nodes.some((node) => node.id === duplicate.id)).toBe(false);
    editor.undo();
    expect(editor.state.get().document).toEqual(copy.document);
    editor.redo();
    expect(editor.state.get().selectedId).toBe('card');
  });

  it('keeps selection out of history and clears redo on a new edit', () => {
    const editor = createEditor();
    editor.select('headline');
    expect(editor.state.get().canUndo).toBe(false);
    editor.edit('headline', 'Text', 'Changed');
    editor.undo();
    expect(
      editor.state.get().document.nodes.find((node) => node.id === 'headline')?.properties.Text,
    ).toBe('Make something persistent.');
    expect(editor.state.get().canRedo).toBe(true);
    editor.edit('headline', 'Text', 'Another change');
    expect(editor.state.get().canRedo).toBe(false);
  });

  it('supports reparenting and prevents duplicate modifiers', () => {
    const editor = createEditor();
    editor.reparent('headline', 'feature');
    expect(editor.state.get().document.nodes.find((node) => node.id === 'headline')?.parent).toBe(
      'feature',
    );
    editor.select('card');
    expect(() => editor.add('UICorner')).toThrow();
    editor.add('UIShadow');
    expect(editor.state.get().document.nodes.at(-1)?.parent).toBe('card');
  });

  it('exports parents before children and treats names and text as literals', () => {
    const editor = createEditor();
    editor.edit('headline', 'Text', '"; alert("no"); //');
    const document = editor.state.get().document;
    const source = exportTypeScript({ ...document, nodes: [...document.nodes].reverse() });
    expect(source).toContain('createUICorner');
    expect(source).toContain('welcomeCard.Parent = canvas;');
    expect(source).toContain(JSON.stringify('"; alert("no"); //'));
    expect(source).toContain("app.mount('#app')");
  });

  it('accepts compound editing values and rejects incomplete buffers', () => {
    const position = nodeDefinitions.Frame.fields.Position;
    expect(parseField(position, '0.5, -12, 0, 40', 'Position')).toEqual({
      X: { Scale: 0.5, Offset: -12 },
      Y: { Scale: 0, Offset: 40 },
    });
    expect(() => parseField(position, '0, , 0, 2', 'Position')).toThrow();
    expect(() =>
      parseField(nodeDefinitions.UICorner.fields.CornerRadius, '', 'CornerRadius'),
    ).toThrow();
  });
});
