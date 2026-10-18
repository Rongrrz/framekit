import {
  bindKeyedChildren,
  createFrame,
  createObservableValue,
  createTextButton,
  createUIListLayout,
} from 'framekit';
import { expect, it, vi } from 'vitest';

it('releases owned views even when the source fails to unsubscribe', () => {
  const parent = createFrame();
  const failure = new Error('source cleanup failed');
  const destroyed = vi.fn();
  const source = {
    get: () => [1, 2],
    onChange: () => () => {
      throw failure;
    },
  };

  const dispose = bindKeyedChildren(parent, source, {
    key: (id) => id,
    create: () => {
      const node = createFrame();
      node.onDestroy(destroyed);

      return node;
    },
  });

  expect(() => dispose()).toThrow(failure);
  expect(parent.getChildren()).toEqual([]);
  expect(destroyed).toHaveBeenCalledTimes(2);
  expect(() => dispose()).not.toThrow();
  parent.destroy();
});

it('rejects an ancestor returned by a factory without destroying caller-owned hierarchy', () => {
  const ancestor = createFrame();
  const parent = createFrame();
  parent.Parent = ancestor;

  expect(() =>
    bindKeyedChildren(parent, createObservableValue([1]), {
      key: (id) => id,
      create: () => ancestor,
    }),
  ).toThrow(/ancestor/);

  expect(ancestor.isDestroyed()).toBe(false);
  expect(parent.Parent).toBe(ancestor);
  expect(parent.getChildren()).toEqual([]);
  ancestor.destroy();
});

it('retains keyed identities, updates views, orders children, and disposes exactly once', () => {
  const parent = createFrame();
  const layout = createUIListLayout();
  layout.Parent = parent;

  const items = createObservableValue<readonly { id: number; text: string }[]>([
    { id: 1, text: 'one' },
    { id: 2, text: 'two' },
  ]);

  const destroyed = vi.fn();

  const create = vi.fn(() => {
    const node = createTextButton();
    node.onDestroy(destroyed);

    return node;
  });

  const dispose = bindKeyedChildren(parent, items, {
    key: (item) => item.id,
    create,

    update: (node, item) => {
      node.Text = item.text;
    },
  });

  const [first, second] = parent.getChildren().filter((child) => child !== layout);
  items.set([
    { id: 2, text: 'updated' },
    { id: 1, text: 'one' },
  ]);
  expect(parent.getChildren()).toEqual([layout, second, first]);
  expect(second?.isA('TextButton') && second.Text).toBe('updated');
  expect(create).toHaveBeenCalledTimes(2);
  items.set([{ id: 2, text: 'two' }]);
  expect(first?.isDestroyed()).toBe(true);
  expect(destroyed).toHaveBeenCalledOnce();
  dispose();
  dispose();
  parent.destroy();
  expect(destroyed).toHaveBeenCalledTimes(2);
});

it('rejects duplicate keys before creating children and releases initial failures', () => {
  const parent = createFrame();
  const create = vi.fn(() => createFrame());
  expect(() =>
    bindKeyedChildren(parent, createObservableValue([1, 1]), { key: (id) => id, create }),
  ).toThrow(/unique keys/);
  expect(create).not.toHaveBeenCalled();

  const created: ReturnType<typeof createFrame>[] = [];
  expect(() =>
    bindKeyedChildren(parent, createObservableValue([1, 2]), {
      key: (id) => id,

      create: () => {
        const node = createFrame();
        created.push(node);

        return node;
      },

      update: (_node, id) => {
        if (id === 2) {
          throw new Error('failed update');
        }
      },
    }),
  ).toThrow('failed update');
  expect(created.every((node) => node.isDestroyed())).toBe(true);
  expect(parent.getChildren()).toEqual([]);
  parent.destroy();
});

it('processes source changes made during reconciliation and cleans up with the parent', () => {
  const parent = createFrame();
  const source = createObservableValue<readonly number[]>([1]);
  const create = vi.fn(() => createFrame());
  bindKeyedChildren(parent, source, {
    key: (id) => id,
    create,

    update: (_node, id) => {
      if (id === 1 && source.get().length === 1) {
        source.set([1, 2]);
      }
    },
  });
  expect(parent.getChildren()).toHaveLength(2);
  parent.destroy();
  source.set([3]);
  expect(create).toHaveBeenCalledTimes(2);
});
