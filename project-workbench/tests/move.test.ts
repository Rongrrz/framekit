import { describe, expect, it } from 'vitest';

import { createSampleDocument, orderedNodes } from '../src/document';
import { createEditor } from '../src/editor';
import { moveBranch } from '../src/move';

const siblings = (editor: ReturnType<typeof createEditor>, parent: string | null): string[] =>
  orderedNodes(editor.state.get().document)
    .filter((node) => node.parent === parent)
    .map((node) => node.id);

describe('Explorer moves', () => {
  it('keeps a drop in the current position out of undo history', () => {
    const editor = createEditor();
    const original = editor.state.get().document;
    editor.move('headline', { parent: 'card', before: 'description' });
    editor.move('card', { parent: null });
    expect(editor.state.get().document).toBe(original);
    expect(editor.state.get().canUndo).toBe(false);
  });

  it('reorders siblings in both directions, preserves descendants, and undoes as one change', () => {
    const editor = createEditor();
    const original = editor.state.get().document;
    editor.move('feature', { parent: 'card', before: 'headline' });
    expect(siblings(editor, 'card').indexOf('feature')).toBeLessThan(
      siblings(editor, 'card').indexOf('headline'),
    );
    expect(
      editor.state.get().document.nodes.find((node) => node.id === 'feature-title')?.parent,
    ).toBe('feature');
    editor.undo();
    expect(editor.state.get().document).toBe(original);
    editor.redo();
    editor.move('feature', { parent: 'card' });
    expect(siblings(editor, 'card').at(-1)).toBe('feature');
  });

  it('moves branches into containers and to the canvas root with stable IDs', () => {
    const editor = createEditor();
    editor.move('headline', { parent: 'feature', before: 'feature-title' });
    expect(siblings(editor, 'feature')).toEqual([
      'feature-corner',
      'headline',
      'feature-title',
      'feature-copy',
    ]);
    editor.move('feature', { parent: null });
    expect(siblings(editor, null)).toEqual(['card', 'feature']);
    expect(editor.state.get().selectedId).toBe('feature');
  });

  it('rejects cycles, invalid containers, duplicate modifiers, and invalid sibling targets atomically', () => {
    const editor = createEditor();
    const original = editor.state.get();
    for (const [id, destination] of [
      ['card', { parent: 'feature' }],
      ['feature', { parent: 'headline' }],
      ['feature-corner', { parent: 'card' }],
      ['feature-corner', { parent: null }],
      ['feature', { parent: 'card', before: 'feature-title' }],
      ['feature', { parent: 'missing' }],
    ] as const) {
      expect(() => editor.move(id, destination)).toThrow();
      expect(editor.state.get()).toBe(original);
    }
  });

  it('resolves sibling order from ownership even when storage is not depth first', () => {
    const original = createSampleDocument();
    const document = { ...original, nodes: [...original.nodes].reverse() };
    const moved = moveBranch(document, 'headline', { parent: 'feature', before: 'feature-title' });
    expect(
      orderedNodes(moved)
        .filter((node) => node.parent === 'feature')
        .map((node) => node.id),
    ).toEqual(['feature-copy', 'headline', 'feature-title', 'feature-corner']);
  });
});

describe('Explorer clipboard', () => {
  it('copies an entire branch, pastes repeatedly with fresh IDs, and undoes a paste', () => {
    const editor = createEditor();
    editor.select('feature');
    editor.copy();
    editor.select(null);
    editor.paste();
    const first = editor.state.get();
    expect(first.document.nodes.find((node) => node.id === first.selectedId)?.parent).toBeNull();
    expect(first.document.nodes.filter((node) => node.parent === first.selectedId)).toHaveLength(3);
    editor.select(null);
    editor.paste();
    expect(editor.state.get().selectedId).not.toBe(first.selectedId);
    expect(editor.state.get().document.nodes).toHaveLength(first.document.nodes.length + 4);
    editor.undo();
    expect(editor.state.get().document).toBe(first.document);
  });

  it('cuts on paste, retains branch IDs, and cancels a cut intent when switching projects', () => {
    const editor = createEditor();
    editor.select('headline');
    editor.copy(true);
    expect(editor.state.get().canUndo).toBe(false);
    editor.select('feature');
    editor.paste();
    expect(editor.state.get().document.nodes.find((node) => node.id === 'headline')?.parent).toBe(
      'feature',
    );
    editor.undo();
    expect(editor.state.get().document.nodes.find((node) => node.id === 'headline')?.parent).toBe(
      'card',
    );
    editor.select('feature');
    editor.copy(true);
    editor.replace(createSampleDocument());
    editor.select(null);
    editor.paste();
    expect(editor.state.get().selectedId).not.toBe('feature');
    expect(editor.state.get().document.nodes.find((node) => node.id === 'feature')?.parent).toBe(
      'card',
    );
  });
});
