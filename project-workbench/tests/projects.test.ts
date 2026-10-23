import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSampleDocument, parseDocument } from '../src/document';
import { createEditor } from '../src/editor';
import { createProjectLibrary } from '../src/projects';
import { projectTemplates } from '../src/templates';

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('project library', () => {
  it('creates independent projects, saves, renames, duplicates, deletes, and restores them', () => {
    const library = createProjectLibrary();
    const first = library.create(createSampleDocument());
    const second = library.create(projectTemplates[0].create());
    library.save(first.id, { ...first.document, name: 'My design' });
    expect(library.state.get().find((project) => project.id === second.id)?.document.nodes).toEqual(
      [],
    );
    const restored = createProjectLibrary();
    expect(restored.state.get().map((project) => project.document.name)).toEqual([
      'My design',
      'Untitled project',
    ]);
    const copy = restored.create({ ...restored.state.get()[0]!.document, name: 'My design copy' });
    expect(copy.id).not.toBe(first.id);
    restored.remove(first.id);
    expect(
      createProjectLibrary()
        .state.get()
        .map((project) => project.id),
    ).toEqual([second.id, copy.id]);
  });

  it('migrates the previous draft without losing it or duplicating it on subsequent visits', () => {
    const document = createSampleDocument();
    window.localStorage.setItem('framekit-workbench-document-v1', JSON.stringify(document));
    const library = createProjectLibrary();
    expect(library.state.get()).toHaveLength(1);
    expect(library.state.get()[0]!.document).toEqual(document);
    expect(createProjectLibrary().state.get()).toEqual(library.state.get());
    expect(window.localStorage.getItem('framekit-workbench-document-v1')).toBeTruthy();
  });

  it('leaves corrupted saved data intact while allowing a new project to be edited in memory', () => {
    const broken = '[{"id":"broken","document":{}}]';
    window.localStorage.setItem('framekit-workbench-projects-v1', broken);
    const library = createProjectLibrary();
    const project = library.create(createSampleDocument());
    library.save(project.id, { ...project.document, name: 'Unsaved work' });
    expect(library.error.get()).toContain('Keep this tab open');
    expect(library.state.get()[0]!.document.name).toBe('Unsaved work');
    expect(window.localStorage.getItem('framekit-workbench-projects-v1')).toBe(broken);
  });

  it('reports quota failure and recovers on a later successful save', () => {
    const library = createProjectLibrary();
    const project = library.create(createSampleDocument());
    const write = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    library.save(project.id, { ...project.document, name: 'Kept in memory' });
    expect(library.error.get()).toContain('Could not save');
    expect(library.state.get()[0]!.document.name).toBe('Kept in memory');
    write.mockRestore();
    library.save(project.id, library.state.get()[0]!.document);
    expect(library.error.get()).toBeNull();
    expect(createProjectLibrary().state.get()[0]!.document.name).toBe('Kept in memory');
  });

  it('starts each template as a valid, independent document and isolates project undo', () => {
    for (const template of projectTemplates) {
      const document = template.create();
      expect(parseDocument(JSON.stringify(document))).toEqual(document);
      expect(template.create()).not.toBe(document);
    }

    const editor = createEditor();
    editor.edit('headline', 'Text', 'Changed first project');
    editor.replace(projectTemplates[0].create());
    expect(editor.state.get().canUndo).toBe(false);
    editor.undo();
    expect(editor.state.get().document.nodes).toEqual([]);
  });
});
