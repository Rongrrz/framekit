import { createObservableValue, udim2FromOffset, type ReadonlyObservableValue } from 'framekit';

import {
  createSampleDocument,
  descendantIds,
  parseDocument,
  validateHierarchy,
  type SceneDocument,
  type Interaction,
  type SceneNode,
} from './document';
import { cloneInternalConnections } from './interactions';
import { moveBranch, type MoveDestination } from './move';
import { editableDocument, makePrefab, replaceScope } from './prefabs';
import {
  defaultProperties,
  definitionFor,
  validateField,
  type NodeType,
  type PropertyValue,
} from './schema';

type Revision = Readonly<{
  project: SceneDocument;
  selectedId: string | null;
  prefabId: string | null;
}>;

/** History availability is published with each revision so controls update together. */
export type EditorSnapshot = Revision &
  Readonly<{ document: SceneDocument; canUndo: boolean; canRedo: boolean }>;

/** One owner for document edits, selection, and reversible document history. */
export type Editor = Readonly<{
  state: ReadonlyObservableValue<EditorSnapshot>;
  select(id: string | null): void;
  openPrefab(id: string | null): void;
  createPrefab(name: string): string;
  insertPrefab(id: string): void;
  removePrefab(id: string): void;
  setEvents(events: readonly string[]): void;
  connect(binding: Interaction): void;
  disconnect(id: string): void;
  add(type: NodeType): void;
  edit(id: string, property: string, value: PropertyValue): void;
  reparent(id: string, parent: string | null): void;
  move(id: string, destination: MoveDestination): void;
  replace(document: SceneDocument): void;
  duplicate(): void;
  copy(cut?: boolean): void;
  paste(): void;
  remove(): void;
  undo(): void;
  redo(): void;
  load(text: string): void;
  configure(patch: Partial<Pick<SceneDocument, 'name' | 'width' | 'height'>>): void;
}>;

/** History stores immutable document revisions; selection alone never consumes an undo step. */
export const createEditor = (initial: SceneDocument = createSampleDocument()): Editor => {
  const past: Revision[] = [];
  const future: Revision[] = [];
  let clipboard:
    | Readonly<{
        root: SceneNode;
        nodes: readonly SceneNode[];
        bindings: readonly Interaction[];
        cutId?: string;
      }>
    | undefined;
  const state = createObservableValue<EditorSnapshot>({
    document: initial,
    project: initial,
    prefabId: null,
    selectedId: initial.nodes[0]?.id ?? null,
    canUndo: false,
    canRedo: false,
  });

  const publish = (revision: Revision): void =>
    state.set({
      ...revision,
      document: editableDocument(revision.project, revision.prefabId),
      canUndo: past.length > 0,
      canRedo: future.length > 0,
    });

  const commitProject = (
    project: SceneDocument,
    selectedId = state.get().selectedId,
    prefabId = state.get().prefabId,
  ): void => {
    if (JSON.stringify(project) === JSON.stringify(state.get().project)) {
      return;
    }

    validateHierarchy(project);
    past.push(state.get());

    if (past.length > 100) {
      past.shift();
    }

    future.length = 0;
    publish({ project, selectedId, prefabId });
  };

  const commit = (document: SceneDocument, selectedId = state.get().selectedId): void =>
    commitProject(replaceScope(state.get().project, state.get().prefabId, document), selectedId);

  const selected = (): SceneNode | undefined =>
    state.get().document.nodes.find((node) => node.id === state.get().selectedId);

  const transform = (id: string, change: (node: SceneNode) => SceneNode): void => {
    const { document } = state.get();
    commit({
      ...document,
      nodes: document.nodes.map((node) => (node.id === id ? change(node) : node)),
    });
  };

  const insertionParent = (type: NodeType): string | null => {
    const current =
      selected() ??
      (state.get().prefabId
        ? state.get().document.nodes.find((node) => node.parent === null)
        : undefined);
    const category = definitionFor(type).category;
    return current &&
      (category === 'modifier'
        ? definitionFor(current.type).category !== 'modifier'
        : definitionFor(current.type).category === 'container')
      ? current.id
      : (current?.parent ?? null);
  };

  const insertCopy = (
    root: SceneNode,
    branch: readonly SceneNode[],
    destination: MoveDestination,
    bindings = state.get().document.bindings ?? [],
  ): void => {
    const { document } = state.get();
    const replacements = new Map(branch.map((node) => [node.id, crypto.randomUUID()]));
    const id = replacements.get(root.id)!;
    const copies = branch.map((node) => ({
      ...node,
      id: replacements.get(node.id)!,
      parent: node.id === root.id ? destination.parent : replacements.get(node.parent!)!,
      properties: {
        ...node.properties,
        Name: node.id === root.id ? `${node.properties.Name} copy` : node.properties.Name,
      },
    }));
    const connections = cloneInternalConnections(bindings, replacements);
    commit(
      moveBranch(
        {
          ...document,
          nodes: [...document.nodes, ...copies],
          ...(connections.length
            ? { bindings: [...(document.bindings ?? []), ...connections] }
            : {}),
        },
        id,
        destination,
      ),
      id,
    );
  };

  return {
    state,
    select: (id): void => {
      if (id === null || state.get().document.nodes.some((node) => node.id === id)) {
        publish({ project: state.get().project, prefabId: state.get().prefabId, selectedId: id });
      }
    },
    openPrefab: (id): void => {
      const { project } = state.get();
      const document = editableDocument(project, id);
      publish({ project, prefabId: id, selectedId: document.nodes[0]?.id ?? null });
    },
    createPrefab: (name): string => {
      const current = state.get();
      const result = makePrefab(current.document, current.selectedId, name);
      commitProject(replaceScope(current.project, current.prefabId, result.document));
      return result.prefab.id;
    },
    insertPrefab: (prefabId): void => {
      const { document } = state.get();
      const prefab = document.prefabs?.find((entry) => entry.id === prefabId);
      const root = prefab?.nodes.find((node) => node.parent === null);

      if (!prefab || !root) {
        throw new TypeError('The prefab no longer exists.');
      }

      const id = crypto.randomUUID();
      commit(
        {
          ...document,
          nodes: [
            ...document.nodes,
            {
              id,
              type: root.type,
              prefabId,
              parent: insertionParent(root.type),
              properties: { Name: prefab.name, Position: udim2FromOffset(32, 32) },
            },
          ],
        },
        id,
      );
    },
    removePrefab: (id): void => {
      const { project, prefabId } = state.get();
      const inUse = [project, ...(project.prefabs ?? [])].some((scope) =>
        scope.nodes.some((node) => node.prefabId === id),
      );

      if (inUse || prefabId === id) {
        throw new TypeError(
          'Remove placed instances and leave this prefab editor before deleting its definition.',
        );
      }

      commitProject({
        ...project,
        prefabs: (project.prefabs ?? []).filter((prefab) => prefab.id !== id),
      });
    },
    setEvents: (events): void => commit({ ...state.get().document, events }),
    connect: (binding): void => {
      const { document } = state.get();
      commit({
        ...document,
        bindings: [
          ...(document.bindings ?? []).filter((entry) => entry.id !== binding.id),
          binding,
        ],
      });
    },
    disconnect: (id): void =>
      commit({
        ...state.get().document,
        bindings: (state.get().document.bindings ?? []).filter((entry) => entry.id !== id),
      }),
    add: (type): void => {
      const { document } = state.get();
      const parent = insertionParent(type);
      const id = crypto.randomUUID();
      const properties = defaultProperties(type);
      commit({ ...document, nodes: [...document.nodes, { id, type, parent, properties }] }, id);
    },
    edit: (id, property, value): void =>
      transform(id, (node) => {
        const field = definitionFor(node.type).fields[property];

        if (!field) {
          throw new TypeError(`Unsupported property: ${property}.`);
        }

        const validated = validateField(field, value, property);
        return { ...node, properties: { ...node.properties, [property]: validated } };
      }),
    reparent: (id, parent): void => {
      const { document } = state.get();

      if (document.nodes.find((node) => node.id === id)?.parent !== parent) {
        commit(moveBranch(document, id, { parent }));
      }
    },
    move: (id, destination): void => commit(moveBranch(state.get().document, id, destination), id),
    replace: (document): void => {
      validateHierarchy(document);
      past.length = 0;
      future.length = 0;

      if (clipboard) {
        clipboard = { root: clipboard.root, nodes: clipboard.nodes, bindings: clipboard.bindings };
      }

      publish({ project: document, prefabId: null, selectedId: document.nodes[0]?.id ?? null });
    },
    duplicate: (): void => {
      const original = selected();

      if (!original) {
        return;
      }

      const { document } = state.get();
      const ids = descendantIds(document, original.id);
      const siblings = document.nodes.filter((node) => node.parent === original.parent);
      const before = siblings[siblings.indexOf(original) + 1]?.id;
      insertCopy(
        original,
        document.nodes.filter((node) => ids.has(node.id)),
        {
          parent: original.parent,
          ...(before ? { before } : {}),
        },
      );
    },
    copy: (cut = false): void => {
      const root = selected();

      if (root) {
        const { document } = state.get();
        const ids = descendantIds(document, root.id);
        clipboard = {
          root,
          nodes: document.nodes.filter((node) => ids.has(node.id)),
          bindings: document.bindings ?? [],
          ...(cut ? { cutId: root.id } : {}),
        };
      }
    },
    paste: (): void => {
      if (!clipboard) {
        return;
      }

      const { cutId, root, nodes, bindings } = clipboard;
      const destination = { parent: insertionParent(root.type) };

      if (cutId && state.get().document.nodes.some((node) => node.id === cutId)) {
        commit(moveBranch(state.get().document, cutId, destination), cutId);
        clipboard = undefined;
      } else {
        insertCopy(root, nodes, destination, bindings);
      }
    },
    remove: (): void => {
      const original = selected();

      if (!original) {
        return;
      }

      const { document } = state.get();
      const removed = descendantIds(document, original.id);
      commit(
        {
          ...document,
          nodes: document.nodes.filter((node) => !removed.has(node.id)),
          ...(document.bindings
            ? {
                bindings: document.bindings.filter(
                  (binding) =>
                    !removed.has(binding.source) &&
                    (binding.action.type === 'emit' ||
                      (!removed.has(binding.action.target) &&
                        (binding.action.type !== 'copyText' ||
                          !removed.has(binding.action.source)))),
                ),
              }
            : {}),
        },
        original.parent,
      );
    },
    undo: (): void => {
      const previous = past.pop();

      if (previous) {
        future.push(state.get());
        publish(previous);
      }
    },
    redo: (): void => {
      const next = future.pop();

      if (next) {
        past.push(state.get());
        publish(next);
      }
    },
    load: (text): void => {
      const document = parseDocument(text);
      commitProject(document, document.nodes[0]?.id ?? null, null);
    },
    configure: (patch): void => {
      const current = state.get();
      const min = current.prefabId ? 4 : 240;

      if (
        (patch.name !== undefined && (!patch.name.trim() || patch.name.length > 200)) ||
        [patch.width, patch.height].some(
          (value) =>
            value !== undefined && (!Number.isFinite(value) || value < min || value > 4096),
        )
      ) {
        throw new TypeError(
          `Use a name of 1–200 characters and dimensions between ${min} and 4096 pixels.`,
        );
      }

      commit({ ...current.document, ...patch });
    },
  };
};
