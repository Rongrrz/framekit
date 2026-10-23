import { createObservableValue, type ReadonlyObservableValue } from 'framekit';

import {
  createSampleDocument,
  descendantIds,
  parseDocument,
  validateHierarchy,
  type SceneDocument,
  type SceneNode,
} from './document';
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
  duplicate(): void;
  remove(): void;
  undo(): void;
  redo(): void;
  load(text: string): void;
  reset(): void;
  configure(patch: Partial<Pick<SceneDocument, 'name' | 'width' | 'height'>>): void;
}>;

/** History stores immutable document revisions; selection alone never consumes an undo step. */
export const createEditor = (initial: SceneDocument = createSampleDocument()): Editor => {
  const past: Revision[] = [];
  const future: Revision[] = [];
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

  return {
    state,
    select: (id): void => {
      if (id === null || state.get().document.nodes.some((node) => node.id === id)) {
        publish({ document: state.get().document, selectedId: id });
      }
    },
    add: (type): void => {
      const { document } = state.get();
      const current = selected();
      const category = definitionFor(type).category;
      const parent =
        current &&
        (category === 'modifier'
          ? definitionFor(current.type).category !== 'modifier'
          : definitionFor(current.type).category === 'container')
          ? current.id
          : (current?.parent ?? null);
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
    reparent: (id, parent): void => transform(id, (node) => ({ ...node, parent })),
    duplicate: (): void => {
      const original = selected();

      if (!original) {
        return;
      }

      const { document } = state.get();
      const ids = descendantIds(document, original.id);
      const replacements = new Map([...ids].map((id) => [id, crypto.randomUUID()]));
      const copies = document.nodes
        .filter((node) => ids.has(node.id))
        .map((node) => ({
          ...node,
          id: replacements.get(node.id)!,
          parent: node.id === original.id ? node.parent : replacements.get(node.parent!)!,
          properties: {
            ...node.properties,
            Name: node.id === original.id ? `${node.properties.Name} copy` : node.properties.Name,
          },
        }));
      const last = document.nodes.findLastIndex((node) => ids.has(node.id));
      commit(
        {
          ...document,
          nodes: [
            ...document.nodes.slice(0, last + 1),
            ...copies,
            ...document.nodes.slice(last + 1),
          ],
        },
        replacements.get(original.id)!,
      );
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
    reset: (): void => {
      const document = createSampleDocument();
      commit(document, document.nodes[0]?.id ?? null);
    },
    configure: (patch): void => {
      const document = parseDocument(JSON.stringify({ ...state.get().document, ...patch }));
      commit(document);
    },
  };
};
