import {
  bindVirtualList,
  createObservableValue,
  createScrollingFrame,
  createTextLabel,
  udim2FromOffset,
} from 'framekit';
import { expect, it, vi } from 'vitest';

import { setupAnimationClock } from '../support/animation-clock.js';
import { installResizeObserver } from '../support/resize-observer.js';

const clock = setupAnimationClock();

it('restores caller state when observation cannot start', () => {
  const viewport = createScrollingFrame({
    ScrollingDirection: 'X',
    CanvasSize: udim2FromOffset(300, 200),
  });
  viewport.unsafeElement.setAttribute('role', 'region');
  viewport.unsafeElement.style.setProperty('overflow-anchor', 'auto', 'important');
  vi.stubGlobal('ResizeObserver', undefined);

  expect(() =>
    bindVirtualList(viewport, createObservableValue([1]), {
      itemHeight: 32,
      key: (id) => id,
      selection: createObservableValue<string | number | undefined>(undefined),
      create: () => createTextLabel(),
    }),
  ).toThrow(/ResizeObserver/);

  expect(viewport.getChildren()).toEqual([]);
  expect(viewport.ScrollingDirection).toBe('X');
  expect(viewport.CanvasSize).toEqual(udim2FromOffset(300, 200));
  expect(viewport.unsafeElement.getAttribute('role')).toBe('region');
  expect(viewport.unsafeElement.style.getPropertyValue('overflow-anchor')).toBe('auto');
  expect(viewport.unsafeElement.style.getPropertyPriority('overflow-anchor')).toBe('important');
  viewport.destroy();
});

it('restores the viewport and releases every row even when a row cleanup fails', () => {
  const viewport = createScrollingFrame({ ScrollingDirection: 'X' });
  const destroyed = vi.fn();
  const failure = new Error('row cleanup failed');

  const list = bindVirtualList(viewport, createObservableValue([1, 2]), {
    itemHeight: 32,
    key: (id) => id,
    selection: createObservableValue<string | number | undefined>(undefined),
    create: (id) => {
      const row = createTextLabel();
      row.onDestroy(() => {
        destroyed(id);

        if (id === 1) {
          throw failure;
        }
      });

      return row;
    },
  });

  expect(() => list.dispose()).toThrow(failure);
  expect(destroyed.mock.calls).toEqual([[1], [2]]);
  expect(viewport.getChildren()).toEqual([]);
  expect(viewport.ScrollingDirection).toBe('X');
  expect(viewport.unsafeElement.hasAttribute('role')).toBe(false);
  expect(viewport.unsafeElement.style.getPropertyValue('overflow-anchor')).toBe('');
  expect(() => list.dispose()).not.toThrow();
  viewport.destroy();
});

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

it('preserves surviving scroll and selection neighbors when several earlier items are deleted', () => {
  const viewport = createScrollingFrame();
  Object.defineProperty(viewport.unsafeElement, 'clientHeight', { value: 160 });

  const source = createObservableValue(Array.from({ length: 100 }, (_, index) => index));
  const selection = createObservableValue<string | number | undefined>(90);

  const list = bindVirtualList(viewport, source, {
    itemHeight: 32,
    key: (id) => id,
    selection,
    create: () => createTextLabel(),
  });

  viewport.unsafeElement.scrollTop = 327; // Item 10 with a seven-pixel offset.
  source.set(source.get().filter((id) => id !== 0 && id !== 10 && id !== 90));
  expect(viewport.unsafeElement.scrollTop).toBe(295); // Surviving item 11 is now at index 9.
  expect(selection.get()).toBe(91);
  list.dispose();
  viewport.destroy();
});

it('rejects caller-owned rows without mutating or destroying them', () => {
  const viewport = createScrollingFrame();
  const parent = createScrollingFrame();
  const row = createTextLabel();
  row.Parent = parent;
  expect(() =>
    bindVirtualList(viewport, createObservableValue([1]), {
      itemHeight: 32,
      key: (id) => id,
      selection: createObservableValue<string | number | undefined>(undefined),
      create: () => row,
    }),
  ).toThrow(/unique, live, unattached/);
  expect(row.Parent).toBe(parent);
  expect(row.isDestroyed()).toBe(false);
  expect(row.unsafeElement.hasAttribute('role')).toBe(false);
  expect(viewport.getChildren()).toEqual([]);
  viewport.destroy();
  parent.destroy();
});

it('accepts measured-row estimates and preserves caller height and automatic sizing', () => {
  const viewport = createScrollingFrame();
  Object.defineProperty(viewport.unsafeElement, 'clientHeight', { value: 160 });

  const row = createTextLabel({ AutomaticSize: 'Y' });

  const binding = bindVirtualList(viewport, createObservableValue([1]), {
    itemHeight: { estimate: 48 },
    key: (id) => id,
    selection: createObservableValue<string | number | undefined>(undefined),
    create: () => row,
  });

  expect(row.AutomaticSize).toBe('Y');
  expect(row.Size.X.Scale).toBe(1);
  expect(viewport.CanvasSize.Y.Offset).toBe(48);
  expect(viewport.unsafeElement.style.getPropertyValue('overflow-anchor')).toBe('none');
  binding.dispose();
  expect(viewport.unsafeElement.style.getPropertyValue('overflow-anchor')).toBe('');
  viewport.destroy();
});

it('rejects invalid measured estimates before changing the viewport', () => {
  const viewport = createScrollingFrame();

  for (const estimate of [0, -1, NaN, Infinity]) {
    expect(() =>
      bindVirtualList(viewport, createObservableValue([1]), {
        itemHeight: { estimate },
        key: (id) => id,
        selection: createObservableValue<string | number | undefined>(undefined),
        create: () => createTextLabel(),
      }),
    ).toThrow();
  }

  expect(viewport.getChildren()).toEqual([]);
  expect(viewport.unsafeElement.hasAttribute('role')).toBe(false);
  viewport.destroy();
});

it('preserves fractional scroll offsets when earlier rows are inserted', () => {
  const viewport = createScrollingFrame();
  Object.defineProperty(viewport.unsafeElement, 'clientHeight', { value: 160 });

  const source = createObservableValue(Array.from({ length: 100 }, (_, id) => id));

  const binding = bindVirtualList(viewport, source, {
    itemHeight: 32,
    key: (id) => id,
    selection: createObservableValue<string | number | undefined>(undefined),
    create: () => createTextLabel(),
  });

  viewport.unsafeElement.scrollTop = 31.5;
  source.set([-1, ...source.get()]);
  expect(viewport.unsafeElement.scrollTop).toBe(63.5);
  binding.dispose();
  viewport.destroy();
});

it('keeps an estimated keyboard jump visible when its first measurements also resize the viewport', () => {
  const resize = installResizeObserver();
  const viewport = createScrollingFrame();
  let width = 0;
  Object.defineProperties(viewport.unsafeElement, {
    clientWidth: { get: () => width },
    clientHeight: { value: 180 },
  });

  const list = bindVirtualList(
    viewport,
    createObservableValue(Array.from({ length: 1000 }, (_, id) => id)),
    {
      itemHeight: { estimate: 48 },
      overscan: 3,
      key: (id) => id,
      selection: createObservableValue<string | number | undefined>(0),
      create: () => {
        const row = createTextLabel();
        Object.defineProperty(row.unsafeElement, 'offsetHeight', { value: 96 });

        return row;
      },
    },
  );

  viewport.unsafeElement.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'End', cancelable: true }),
  );
  width = 320;
  resize();
  clock.advance();

  const selected = viewport.unsafeElement.querySelector<HTMLElement>('[aria-selected="true"]')!;
  const top = parseFloat(selected.style.top);
  expect(top).toBeGreaterThanOrEqual(viewport.unsafeElement.scrollTop);
  expect(top + 96).toBeLessThanOrEqual(viewport.unsafeElement.scrollTop + 180);
  list.dispose();
  viewport.destroy();
});
