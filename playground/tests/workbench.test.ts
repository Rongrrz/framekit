import { describe, expect, it } from 'vitest';

import { createWorkbenchModel, visibleObjects } from '../src/workbench/model';

describe('workbench document commands', () => {
  it('adds, edits, reorders, removes, and restores objects through undo/redo', () => {
    const model = createWorkbenchModel();
    model.select('primary');
    model.add();
    const added = model.state.get().selectedId;
    model.patch(added, { name: 'New card', width: 240 });
    expect(model.state.get().objects.find((object) => object.id === added)?.name).toBe('New card');
    model.move(-1);
    model.remove();
    expect(model.state.get().objects.some((object) => object.id === added)).toBe(false);
    model.undo();
    expect(model.state.get().selectedId).toBe(added);
    model.redo();
    expect(model.state.get().objects.some((object) => object.id === added)).toBe(false);
  });

  it('groups a continuous edit into one undo step and cancels uncommitted edits', () => {
    const model = createWorkbenchModel();
    const original = model.state.get().objects.find((object) => object.id === 'title')!;
    model.beginEdit();
    model.patch('title', { x: 100 });
    model.patch('title', { x: 120 });
    model.endEdit();
    model.undo();
    expect(model.state.get().objects.find((object) => object.id === 'title')?.x).toBe(original.x);
    model.beginEdit();
    model.patch('title', { x: 500 });
    model.cancelEdit();
    expect(model.state.get().canRedo).toBe(true);
    expect(model.state.get().objects.find((object) => object.id === 'title')?.x).toBe(original.x);
  });

  it('removes a group and its descendants while protecting the document root', () => {
    const model = createWorkbenchModel();
    model.select('header');
    model.remove();
    expect(model.state.get().objects.some((object) => object.id === 'title')).toBe(false);
    expect(model.state.get().selectedId).toBe('canvas');
    model.remove();
    expect(model.state.get().objects.some((object) => object.id === 'canvas')).toBe(true);
    model.undo();
    expect(model.state.get().objects.some((object) => object.id === 'title')).toBe(true);
  });

  it('rejects invalid properties without recording history', () => {
    const model = createWorkbenchModel();
    const before = model.state.get().objects;
    model.patch('title', { width: -1 });
    model.patch('title', { x: NaN });
    model.patch('title', { color: 'red' });
    model.patch('title', { name: '' });
    expect(model.state.get().objects).toBe(before);
    expect(model.state.get().canUndo).toBe(false);
  });

  it('searches descendants with ancestor context and respects collapsed groups otherwise', () => {
    const objects = createWorkbenchModel().state.get().objects;
    expect(
      visibleObjects(objects, 'welcome', new Set(['header'])).map(({ object }) => object.id),
    ).toEqual(['canvas', 'header', 'title']);
    expect(
      visibleObjects(objects, '', new Set(['header'])).some(({ object }) => object.id === 'title'),
    ).toBe(false);
  });
});
