import {
  bindVirtualList,
  createObservableValue,
  createScrollingFrame,
  createTextLabel,
} from 'framekit';
import { expect, it, vi } from 'vitest';

it('mounts a bounded window and releases views and subscriptions on disposal', () => {
  const viewport = createScrollingFrame();
  Object.defineProperty(viewport.unsafeElement, 'clientHeight', { value: 160 });
  const source = createObservableValue<readonly number[]>(
    Array.from({ length: 10_000 }, (_, index) => index),
  );
  const selection = createObservableValue<string | number | undefined>(0);
  const destroyed = vi.fn();
  const create = vi.fn(() => {
    const row = createTextLabel();
    row.onDestroy(destroyed);
    return row;
  });
  const list = bindVirtualList(viewport, source, {
    itemHeight: 32,
    key: (id) => id,
    selection,
    create,
  });
  expect(create.mock.calls.length).toBeLessThanOrEqual(9);
  const mounted = create.mock.calls.length;
  list.dispose();
  list.dispose();
  expect(destroyed).toHaveBeenCalledTimes(mounted);
  expect(viewport.getChildren()).toEqual([]);
  source.set([1, 2]);
  expect(create).toHaveBeenCalledTimes(mounted);
  expect(viewport.unsafeElement.hasAttribute('role')).toBe(false);
  viewport.destroy();
});

it('rejects invalid geometry and duplicate keys without retaining a subtree', () => {
  const viewport = createScrollingFrame();
  const source = createObservableValue([1, 1]);
  const options = {
    key: (id: number) => id,
    selection: createObservableValue<string | number | undefined>(undefined),
    create: () => createTextLabel(),
  };
  expect(() => bindVirtualList(viewport, source, { ...options, itemHeight: 0 })).toThrow();
  expect(() => bindVirtualList(viewport, source, { ...options, itemHeight: 32 })).toThrow(
    /unique keys/,
  );
  expect(viewport.getChildren()).toEqual([]);
  viewport.destroy();
});
