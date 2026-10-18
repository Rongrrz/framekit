import { createFrame, createUIGridLayout, createUIListLayout, udim2FromOffset } from 'framekit';
import { describe, expect, it, vi } from 'vitest';

import { createStyleModifier } from '#internal/runtime/node/modifier.js';

describe.each([createUIListLayout, createUIGridLayout])(
  'active layout mutations (%#)',
  (createLayout) => {
    it('keeps placement current when the last layout moves between parents or is destroyed', () => {
      const source = createFrame();
      const destination = createFrame();
      const sourceLast = createFrame({ LayoutOrder: 2 });
      const sourceFirst = createFrame({ LayoutOrder: 0 });
      sourceLast.Parent = source;
      sourceFirst.Parent = source;

      const destinationLast = createFrame({ LayoutOrder: 3 });
      const destinationFirst = createFrame({ LayoutOrder: 1 });
      destinationLast.Parent = destination;
      destinationFirst.Parent = destination;

      const layout = createLayout();
      layout.Parent = source;

      layout.Parent = destination;

      expect([...source.unsafeElement.children]).toEqual([
        sourceLast.unsafeElement,
        sourceFirst.unsafeElement,
      ]);
      expect(sourceFirst.unsafeElement.style.position).toBe('absolute');

      const plain = createFrame({ LayoutOrder: -1 });
      plain.Parent = source;
      expect(source.unsafeElement.lastElementChild).toBe(plain.unsafeElement);
      expect(plain.unsafeElement.style.position).toBe('absolute');

      const arranged = createFrame({ LayoutOrder: 2 });
      arranged.Parent = destination;
      sourceFirst.Parent = destination;
      expect([...destination.unsafeElement.children]).toEqual(
        [sourceFirst, destinationFirst, arranged, destinationLast].map((row) => row.unsafeElement),
      );
      expect(sourceFirst.unsafeElement.style.position).toBe('relative');

      layout.destroy();
      sourceLast.Parent = destination;
      expect([...destination.unsafeElement.children]).toEqual(
        [destinationLast, destinationFirst, arranged, sourceFirst, sourceLast].map(
          (row) => row.unsafeElement,
        ),
      );

      for (const row of [destinationLast, destinationFirst, arranged, sourceFirst, sourceLast]) {
        expect(row.unsafeElement.style.position).toBe('absolute');
      }

      source.destroy();
      destination.destroy();
    });

    it('keeps lower style orders from overriding layout and restores them on detachment', () => {
      const parent = createFrame();
      const first = createFrame({ LayoutOrder: 0 });
      const last = createFrame({ LayoutOrder: 1 });
      createStyleModifier('CustomOrder', { Name: 'CustomOrder' }, () => ({ order: '7' })).Parent =
        first;

      createStyleModifier('CustomOrder', { Name: 'CustomOrder' }, () => ({ order: '-5' })).Parent =
        last;
      first.Parent = parent;
      last.Parent = parent;

      const layout = createLayout();
      layout.Parent = parent;

      expect([...parent.unsafeElement.children]).toEqual([first.unsafeElement, last.unsafeElement]);
      expect(first.unsafeElement.style.order).toBe('0');
      expect(last.unsafeElement.style.order).toBe('0');
      layout.Parent = undefined;
      expect(first.unsafeElement.style.order).toBe('7');
      expect(last.unsafeElement.style.order).toBe('-5');
      layout.destroy();
      parent.destroy();
    });

    it('prepends and removes a row without mutating surviving row attributes', () => {
      const parent = createFrame();
      createLayout().Parent = parent;

      const rows = [createFrame(), createFrame()];

      for (const row of rows) {
        row.Parent = parent;
      }

      const observer = new MutationObserver(() => undefined);

      for (const row of rows) {
        observer.observe(row.unsafeElement, { attributes: true });
      }

      const first = createFrame({ LayoutOrder: -1 });
      first.Parent = parent;
      expect([...parent.unsafeElement.children]).toEqual([
        first.unsafeElement,
        ...rows.map((row) => row.unsafeElement),
      ]);
      expect(observer.takeRecords()).toHaveLength(0);
      first.destroy();
      expect([...parent.unsafeElement.children]).toEqual(rows.map((row) => row.unsafeElement));
      expect(observer.takeRecords()).toHaveLength(0);
      observer.disconnect();
      parent.destroy();
    });

    it('restores detached placement and keeps order correct through reparenting and destruction', () => {
      const parent = createFrame();
      const destination = createFrame();
      createLayout().Parent = parent;
      createLayout().Parent = destination;

      const first = createFrame({
        LayoutOrder: 0,
        Position: udim2FromOffset(12, 15),
        Size: udim2FromOffset(140, 60),
      });

      const middle = createFrame({ LayoutOrder: 1 });
      const last = createFrame({ LayoutOrder: 2 });
      createUIListLayout().Parent = first;

      for (const child of [first, middle, last]) {
        child.Parent = parent;
      }

      first.Parent = undefined;

      expect(first.unsafeElement.style.position).toBe('absolute');
      expect(first.unsafeElement.style.left).toBe('12px');
      expect(first.unsafeElement.style.width).toBe('140px');
      expect(first.unsafeElement.style.display).toBe('flex');
      expect([...parent.unsafeElement.children]).toEqual([
        middle.unsafeElement,
        last.unsafeElement,
      ]);
      middle.Parent = destination;
      first.Parent = destination;

      expect([...destination.unsafeElement.children]).toEqual([
        first.unsafeElement,
        middle.unsafeElement,
      ]);
      expect(parent.unsafeElement.firstElementChild).toBe(last.unsafeElement);
      first.destroy();
      expect(destination.unsafeElement.firstElementChild).toBe(middle.unsafeElement);

      const appended = createFrame({ LayoutOrder: 3 });
      appended.Parent = destination;
      expect([...destination.unsafeElement.children]).toEqual([
        middle.unsafeElement,
        appended.unsafeElement,
      ]);
      parent.destroy();
      destination.destroy();
    });

    it('commits removal before cleanup callbacks mutate the layout, even when cleanup fails', () => {
      const parent = createFrame();
      createLayout().Parent = parent;

      const first = createFrame({ LayoutOrder: 0 });
      const last = createFrame({ LayoutOrder: 2 });
      first.Parent = parent;
      last.Parent = parent;

      const inserted = createFrame({ LayoutOrder: 1 });
      first.onDestroy(() => {
        expect(parent.getChildren().includes(first)).toBe(false);
        expect(last.unsafeElement.style.position).toBe('relative');
        inserted.Parent = parent;

        throw new Error('Cleanup failed');
      });

      expect(() => first.destroy()).toThrow(/Cleanup failed/);
      expect(first.isDestroyed()).toBe(true);
      expect([...parent.unsafeElement.children]).toEqual([
        inserted.unsafeElement,
        last.unsafeElement,
      ]);
      expect(parent.getChildren()).toContain(inserted);
      parent.destroy();
    });

    it('restores hierarchy, DOM order, and positioning if removing a placement layer fails', () => {
      const parent = createFrame();
      createLayout().Parent = parent;

      const first = createFrame();
      const last = createFrame();
      first.Parent = parent;
      last.Parent = parent;

      const setProperty = first.unsafeElement.style.setProperty.bind(first.unsafeElement.style);

      const failure = vi
        .spyOn(first.unsafeElement.style, 'setProperty')
        .mockImplementation((property, value, priority) => {
          if (property === 'position' && value === 'absolute') {
            throw new Error('Placement reset failed');
          }

          setProperty(property, value, priority);
        });

      expect(() => {
        first.Parent = undefined;
      }).toThrow(/Placement reset failed/);
      expect(first.Parent).toBe(parent);
      expect([...parent.unsafeElement.children]).toEqual([first.unsafeElement, last.unsafeElement]);
      expect(first.unsafeElement.style.position).toBe('relative');
      failure.mockRestore();
      parent.destroy();
    });

    it('inserts by sort key and preserves equal-key hierarchy order after explicit reorder', () => {
      const parent = createFrame();
      const layout = createLayout();
      layout.Parent = parent;

      const later = createFrame({ LayoutOrder: 2 });
      const first = createFrame({ LayoutOrder: 1 });
      const equal = createFrame({ LayoutOrder: 1 });

      for (const child of [later, first, equal]) {
        child.Parent = parent;
      }

      expect([...parent.unsafeElement.children]).toEqual(
        [first, equal, later].map((child) => child.unsafeElement),
      );
      parent.reorderChildren([layout, later, equal, first]);

      const appended = createFrame({ LayoutOrder: 1 });
      appended.Parent = parent;

      const expected = [equal, first, appended, later];
      expect([...parent.unsafeElement.children]).toEqual(
        expected.map((child) => child.unsafeElement),
      );
      expect(parent.getChildren()).toEqual([layout, later, equal, first, appended]);
      parent.destroy();
    });

    it('uses current name sorting after properties and layout settings change', () => {
      const parent = createFrame();
      const layout = createLayout();
      layout.Parent = parent;

      const beta = createFrame({ Name: 'Beta' });
      const alpha = createFrame({ Name: 'Alpha' });
      beta.Parent = parent;
      alpha.Parent = parent;
      layout.SortOrder = 'Name';
      beta.Name = 'Gamma';

      const middle = createFrame({ Name: 'Beta' });
      const equal = createFrame({ Name: 'Alpha' });
      middle.Parent = parent;
      equal.Parent = parent;

      expect([...parent.unsafeElement.children]).toEqual(
        [alpha, equal, middle, beta].map((child) => child.unsafeElement),
      );
      parent.destroy();
    });

    it('restores the hierarchy and placement styles when sorted DOM insertion fails', () => {
      const parent = createFrame();
      const existing = createFrame({ LayoutOrder: 2 });
      existing.Parent = parent;
      createLayout().Parent = parent;

      const child = createFrame({ LayoutOrder: 1, Position: udim2FromOffset(12, 15) });
      const insertBefore = parent.unsafeElement.insertBefore.bind(parent.unsafeElement);
      vi.spyOn(parent.unsafeElement, 'insertBefore').mockImplementation((node, before) => {
        if (before === existing.unsafeElement) {
          throw new Error('Sorted insertion failed');
        }

        return insertBefore(node, before);
      });

      expect(() => {
        child.Parent = parent;
      }).toThrow(/Sorted insertion failed/);
      expect(child.Parent).toBeUndefined();
      expect(child.unsafeElement.parentElement).toBeNull();
      expect(child.unsafeElement.style.position).toBe('absolute');
      expect(child.unsafeElement.style.left).toBe('12px');
      expect(child.unsafeElement.style.width).toBe('100px');
      expect(parent.unsafeElement.firstElementChild).toBe(existing.unsafeElement);
      expect(parent.getChildren()).not.toContain(child);
      child.destroy();
      parent.destroy();
    });
  },
);

it('gives child layout to one modifier and switches cleanly when it is replaced', () => {
  const parent = createFrame();
  const other = createFrame();
  const list = createUIListLayout({ SortOrder: 'Name' });
  const grid = createUIGridLayout();
  list.Parent = parent;
  grid.Parent = other;

  const first = createFrame({ Name: 'Zebra', LayoutOrder: 1 });
  const second = createFrame({ Name: 'Alpha', LayoutOrder: 2 });
  first.Parent = parent;
  second.Parent = parent;

  expect(() => (grid.Parent = parent)).toThrow(/already has a layout/);
  expect(grid.Parent).toBe(other);
  expect(other.unsafeElement.style.display).toBe('grid');
  expect([...parent.unsafeElement.children]).toEqual([second.unsafeElement, first.unsafeElement]);

  list.Parent = undefined;
  grid.Parent = parent;

  expect(parent.unsafeElement.style.display).toBe('grid');
  expect(other.unsafeElement.style.display).toBe('');
  expect([...parent.unsafeElement.children]).toEqual([first.unsafeElement, second.unsafeElement]);
  expect(second.unsafeElement.style.flexShrink).toBe('');
  expect(second.unsafeElement.style.width).toBe('100%');
  grid.destroy();
  expect(second.unsafeElement.style.width).toBe('100px');
  parent.destroy();
  other.destroy();
  list.destroy();
});
