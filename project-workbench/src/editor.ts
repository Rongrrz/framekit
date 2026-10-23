import { createObservableValue, type ReadonlyObservableValue } from 'framekit';

import {
  createSampleDocument,
  descendantIds,
  parseDocument,
  validateHierarchy,
  type SceneDocument,
  type SceneNode,
} from './document';
import { moveBranch, type MoveDestination } from './move';
import {
  defaultProperties,
  definitionFor,
  validateField,
  type NodeType,
  type PropertyValue,
} from './schema';

type Revision = Readonly<{ document: SceneDocument; selectedId: string | null }>;

/** History availability is published with each revision so controls update together. */
export type EditorSnapshot = Revision & Readonly<{ canUndo: boolean; canRedo: boolean }>;

/** One owner for document edits, selection, and reversible document history. */
export type Editor = Readonly<{
  state: ReadonlyObservableValue<EditorSnapshot>;
  select(id: string | null): void;
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
    | Readonly<{ root: SceneNode; nodes: readonly SceneNode[]; cutId?: string }>
    | undefined;
  const state = createObservableValue<EditorSnapshot>({
    document: initial,
    selectedId: initial.nodes[0]?.id ?? null,
    canUndo: false,
    canRedo: false,
  });

  const publish = (revision: Revision): void =>
    state.set({ ...revision, canUndo: past.length > 0, canRedo: future.length > 0 });

  const commit = (document: SceneDocument, selectedId = state.get().selectedId): void => {
    if (JSON.stringify(document) === JSON.stringify(state.get().document)) {
      return;
    }

    validateHierarchy(document);
    past.push(state.get());

    if (past.length > 100) {
      past.shift();
    }

    future.length = 0;
    publish({ document, selectedId });
  };

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
    const current = selected();
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
    commit(moveBranch({ ...document, nodes: [...document.nodes, ...copies] }, id, destination), id);
  };

  return {
    state,
    select: (id): void => {
      if (id === null || state.get().document.nodes.some((node) => node.id === id)) {
        publish({ document: state.get().document, selectedId: id });
      }
    },
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
        clipboard = { root: clipboard.root, nodes: clipboard.nodes };
      }

      publish({ document, selectedId: document.nodes[0]?.id ?? null });
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
          ...(cut ? { cutId: root.id } : {}),
        };
      }
    },
    paste: (): void => {
      if (!clipboard) {
        return;
      }

      const { cutId, root, nodes } = clipboard;
      const destination = { parent: insertionParent(root.type) };

      if (cutId && state.get().document.nodes.some((node) => node.id === cutId)) {
        commit(moveBranch(state.get().document, cutId, destination), cutId);
        clipboard = undefined;
      } else {
        insertCopy(root, nodes, destination);
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
        { ...document, nodes: document.nodes.filter((node) => !removed.has(node.id)) },
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
      commit(document, document.nodes[0]?.id ?? null);
    },
    configure: (patch): void => {
      const document = parseDocument(JSON.stringify({ ...state.get().document, ...patch }));
      commit(document);
    },
  };
};
