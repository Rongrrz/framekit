import { createComputedValue, createObservableValue, type ReadonlyObservableValue } from 'framekit';

/** Serializable design data survives destruction of any view that presents it. */
export type DesignObject = Readonly<{
  id: string;
  parentId: string | undefined;
  kind: 'group' | 'card';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}>;

type DesignDocument = Readonly<{ objects: readonly DesignObject[]; selectedId: string }>;
export type WorkbenchState = DesignDocument & Readonly<{ canUndo: boolean; canRedo: boolean }>;
export type ObjectPatch = Partial<
  Pick<DesignObject, 'name' | 'x' | 'y' | 'width' | 'height' | 'color'>
>;

/** Commands own history; views only observe state and send user intent. */
export type WorkbenchModel = Readonly<{
  state: ReadonlyObservableValue<WorkbenchState>;
  select(id: string): void;
  add(kind?: DesignObject['kind']): void;
  remove(): void;
  move(direction: -1 | 1): void;
  patch(id: string, patch: ObjectPatch): void;
  beginEdit(): void;
  endEdit(): void;
  cancelEdit(): void;
  undo(): void;
  redo(): void;
}>;

const initialObjects: readonly DesignObject[] = [
  {
    id: 'canvas',
    parentId: undefined,
    kind: 'group',
    name: 'Canvas',
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    color: '#171e27',
  },
  {
    id: 'header',
    parentId: 'canvas',
    kind: 'group',
    name: 'Header',
    x: 0,
    y: 0,
    width: 800,
    height: 200,
    color: '#171e27',
  },
  {
    id: 'title',
    parentId: 'header',
    kind: 'card',
    name: 'Welcome',
    x: 48,
    y: 52,
    width: 280,
    height: 112,
    color: '#76edad',
  },
  {
    id: 'content',
    parentId: 'canvas',
    kind: 'group',
    name: 'Content',
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    color: '#171e27',
  },
  {
    id: 'primary',
    parentId: 'content',
    kind: 'card',
    name: 'Explore',
    x: 48,
    y: 206,
    width: 184,
    height: 160,
    color: '#70b2ff',
  },
  {
    id: 'secondary',
    parentId: 'content',
    kind: 'card',
    name: 'Create',
    x: 260,
    y: 206,
    width: 184,
    height: 160,
    color: '#af8eff',
  },
];

/** Creates a bounded, in-memory editor history with one undo step per drag or field edit. */
export const createWorkbenchModel = (): WorkbenchModel => {
  const history = createObservableValue<
    Readonly<{
      past: readonly DesignDocument[];
      present: DesignDocument;
      future: readonly DesignDocument[];
    }>
  >({ past: [], present: { objects: initialObjects, selectedId: 'title' }, future: [] });
  let nextId = 0;
  let editing: ReturnType<typeof history.get> | undefined;
  const state = createComputedValue([history], () => {
    const current = history.get();
    return {
      ...current.present,
      canUndo: current.past.length > 0,
      canRedo: current.future.length > 0,
    };
  });
  const endEdit = (): void => {
    const before = editing;
    editing = undefined;
    if (before && before.present.objects !== history.get().present.objects) {
      history.update((current) => ({
        ...current,
        past: [...current.past, before.present].slice(-100),
        future: [],
      }));
    }
  };
  const commit = (next: DesignDocument): void => {
    const current = history.get();
    if (next.objects === current.present.objects) {
      return;
    }
    history.set({
      past: editing ? current.past : [...current.past, current.present].slice(-100),
      present: next,
      future: editing ? current.future : [],
    });
  };
  const selected = (): DesignObject =>
    history.get().present.objects.find((object) => object.id === history.get().present.selectedId)!;
  const model: WorkbenchModel = {
    state,
    select: (id): void => {
      endEdit();
      if (history.get().present.objects.some((object) => object.id === id)) {
        history.update((current) => ({
          ...current,
          present: { ...current.present, selectedId: id },
        }));
      }
    },
    add: (kind = 'card'): void => {
      endEdit();
      nextId += 1;
      const target = selected();
      const id = `object-${nextId}`;
      const object: DesignObject = {
        id,
        parentId: target.kind === 'group' ? target.id : target.parentId,
        kind,
        name: `${kind === 'card' ? 'Card' : 'Group'} ${nextId}`,
        x: 80 + (nextId % 5) * 24,
        y: 90 + (nextId % 5) * 24,
        width: 180,
        height: 120,
        color: '#ffb75e',
      };
      commit({ objects: [...history.get().present.objects, object], selectedId: id });
    },
    remove: (): void => {
      endEdit();
      const target = selected();
      if (!target.parentId) {
        return;
      }
      const removed = new Set([target.id]);
      const objects = history.get().present.objects;
      // Parent references are acyclic; closure also handles objects stored out of tree order.
      while (true) {
        const size = removed.size;
        for (const object of objects) {
          if (object.parentId && removed.has(object.parentId)) {
            removed.add(object.id);
          }
        }
        if (removed.size === size) {
          break;
        }
      }
      commit({
        objects: objects.filter((object) => !removed.has(object.id)),
        selectedId: target.parentId,
      });
    },
    move: (direction): void => {
      endEdit();
      const target = selected();
      const current = history.get().present;
      const siblings = current.objects.filter((object) => object.parentId === target.parentId);
      const index = siblings.indexOf(target);
      const neighbor = siblings[index + direction];
      if (!neighbor) {
        return;
      }
      const objects = [...current.objects];
      const left = objects.indexOf(target);
      const right = objects.indexOf(neighbor);
      objects[left] = neighbor;
      objects[right] = target;
      commit({ ...current, objects });
    },
    patch: (id, patch): void => {
      const current = history.get().present;
      const target = current.objects.find((object) => object.id === id);
      if (!target) {
        return;
      }
      const next = { ...target, ...patch };
      if (
        !next.name.trim() ||
        !/^#[\da-f]{6}$/i.test(next.color) ||
        ![next.x, next.y, next.width, next.height].every(Number.isFinite) ||
        next.width < 16 ||
        next.height < 16 ||
        next.width > 4000 ||
        next.height > 4000
      ) {
        return;
      }
      if ((Object.keys(patch) as (keyof ObjectPatch)[]).every((key) => next[key] === target[key])) {
        return;
      }
      commit({
        ...current,
        objects: current.objects.map((object) => (object.id === id ? next : object)),
      });
    },
    beginEdit: (): void => {
      endEdit();
      editing = history.get();
    },
    endEdit,
    cancelEdit: (): void => {
      if (editing) {
        const before = editing;
        editing = undefined;
        history.set(before);
      }
    },
    undo: (): void => {
      endEdit();
      const current = history.get();
      const previous = current.past.at(-1);
      if (previous) {
        history.set({
          past: current.past.slice(0, -1),
          present: previous,
          future: [current.present, ...current.future],
        });
      }
    },
    redo: (): void => {
      endEdit();
      const current = history.get();
      const next = current.future[0];
      if (next) {
        history.set({
          past: [...current.past, current.present],
          present: next,
          future: current.future.slice(1),
        });
      }
    },
  };
  return model;
};

/** Tree visibility is derived from document data, search, and collapsed group identifiers. */
export const visibleObjects = (
  objects: readonly DesignObject[],
  search: string,
  collapsed: ReadonlySet<string>,
): readonly Readonly<{ object: DesignObject; level: number }>[] => {
  const query = search.trim().toLocaleLowerCase();
  const matches = new Set(
    objects
      .filter((object) => object.name.toLocaleLowerCase().includes(query))
      .map((object) => object.id),
  );
  const byId = new Map(objects.map((object) => [object.id, object]));
  if (query) {
    for (const id of matches) {
      let parent = byId.get(id)?.parentId;
      while (parent) {
        matches.add(parent);
        parent = byId.get(parent)?.parentId;
      }
    }
  }
  const result: { object: DesignObject; level: number }[] = [];
  const visit = (parentId: string | undefined, level: number): void => {
    for (const object of objects.filter((object) => object.parentId === parentId)) {
      if (query && !matches.has(object.id)) {
        continue;
      }
      result.push({ object, level });
      if (query || !collapsed.has(object.id)) {
        visit(object.id, level + 1);
      }
    }
  };
  visit(undefined, 1);
  return result;
};
