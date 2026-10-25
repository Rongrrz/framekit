import { createObservableValue, type ReadonlyObservableValue } from 'framekit';

import { parseDocument, type SceneDocument } from './document';

const libraryKey = 'framekit-workbench-projects-v1';
const legacyKey = 'framekit-workbench-document-v1';

/** Project identity survives renaming and keeps independent documents and history sessions. */
export type SavedProject = Readonly<{
  id: string;
  document: SceneDocument;
  createdAt: number;
  updatedAt: number;
}>;

export type ProjectLibrary = Readonly<{
  state: ReadonlyObservableValue<readonly SavedProject[]>;
  error: ReadonlyObservableValue<string | null>;
  create(document: SceneDocument): SavedProject;
  save(id: string, document: SceneDocument): void;
  remove(id: string): void;
}>;

/** Storage failures keep changes in memory and propagate to the visible save status. */
export const createProjectLibrary = (): ProjectLibrary => {
  let projects: readonly SavedProject[] = [];
  let warning = '';

  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(libraryKey) ?? 'null');

    if (stored !== null) {
      if (!Array.isArray(stored)) {
        throw new TypeError('Invalid project library.');
      }

      const ids = new Set<string>();
      projects = stored.map((value: unknown) => {
        if (
          typeof value !== 'object' ||
          value === null ||
          !('id' in value) ||
          typeof value.id !== 'string' ||
          !/^[a-zA-Z0-9_-]{1,80}$/.test(value.id) ||
          ids.has(value.id) ||
          !('createdAt' in value) ||
          typeof value.createdAt !== 'number' ||
          !Number.isFinite(value.createdAt) ||
          !('updatedAt' in value) ||
          typeof value.updatedAt !== 'number' ||
          !Number.isFinite(value.updatedAt) ||
          !('document' in value)
        ) {
          throw new TypeError('Invalid saved project.');
        }

        ids.add(value.id);
        return {
          id: value.id,
          document: parseDocument(JSON.stringify(value.document)),
          createdAt: value.createdAt,
          updatedAt: value.updatedAt,
        };
      });
    } else {
      const legacy = window.localStorage.getItem(legacyKey);

      if (legacy) {
        const timestamp = Date.now();
        projects = [
          {
            id: crypto.randomUUID(),
            document: parseDocument(legacy),
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ];
        window.localStorage.setItem(libraryKey, JSON.stringify(projects));
      }
    }
  } catch {
    warning = 'Could not restore browser storage. Existing saved data has been left untouched.';
  }

  const state = createObservableValue(projects);
  const error = createObservableValue<string | null>(warning || null);
  // Do not overwrite an unreadable library with a new empty one.
  const blocked = Boolean(warning);
  const persist = (next: readonly SavedProject[]): void => {
    state.set(next);

    if (blocked) {
      error.set(
        'Browser storage could not be restored. Keep this tab open and download a project backup to keep your work.',
      );
      return;
    }

    try {
      window.localStorage.setItem(libraryKey, JSON.stringify(next));
      error.set(null);
    } catch {
      error.set(
        'Could not save in this browser. Keep this tab open and download a project backup to keep your work.',
      );
    }
  };

  return {
    state,
    error,
    create: (document): SavedProject => {
      const timestamp = Date.now();
      const project = {
        id: crypto.randomUUID(),
        document,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      persist([...state.get(), project]);
      return project;
    },
    save: (id, document): void => {
      if (!state.get().some((project) => project.id === id)) {
        throw new Error('This project no longer exists.');
      }

      persist(
        state
          .get()
          .map((project) =>
            project.id === id ? { ...project, document, updatedAt: Date.now() } : project,
          ),
      );
    },
    remove: (id): void => persist(state.get().filter((project) => project.id !== id)),
  };
};
