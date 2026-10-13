import { createFrame, createUIGridLayout, createUIListLayout, udim2FromOffset } from 'framekit';
import { describe, expect, it, vi } from 'vitest';

import { resetDocumentAfterEach } from '../support/reset-document.js';

resetDocumentAfterEach();

describe.each([createUIListLayout, createUIGridLayout])(
  'active layout mutations (%#)',
  (createLayout) => {
    it('restores detached placement and keeps ranks correct through reparenting and destruction', () => {
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
      expect([middle, last].map((child) => child.unsafeElement.style.order)).toEqual(['0', '1']);
      middle.Parent = destination;
      first.Parent = destination;

      expect([...destination.unsafeElement.children]).toEqual([
        first.unsafeElement,
        middle.unsafeElement,
      ]);
      expect(last.unsafeElement.style.order).toBe('0');
      first.destroy();
      expect(middle.unsafeElement.style.order).toBe('0');
      const appended = createFrame({ LayoutOrder: 3 });
      appended.Parent = destination;
      expect(appended.unsafeElement.style.order).toBe('1');
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
        expect(last.unsafeElement.style.order).toBe('0');
        inserted.Parent = parent;
        throw new Error('Cleanup failed');
      });

      expect(() => first.destroy()).toThrow(/Cleanup failed/);
      expect(first.isDestroyed()).toBe(true);
      expect([...parent.unsafeElement.children]).toEqual([
        inserted.unsafeElement,
        last.unsafeElement,
      ]);
      expect([inserted, last].map((child) => child.unsafeElement.style.order)).toEqual(['0', '1']);
      parent.destroy();
    });

    it('restores hierarchy, DOM order, and ranks if removing a placement layer fails', () => {
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
      expect([first, last].map((child) => child.unsafeElement.style.order)).toEqual(['0', '1']);
      failure.mockRestore();
      parent.destroy();
    });

    it('inserts by rank and preserves equal-key hierarchy order after explicit reorder', () => {
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
      expect(expected.map((child) => child.unsafeElement.style.order)).toEqual([
        '0',
        '1',
        '2',
        '3',
      ]);
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
      expect(existing.unsafeElement.style.order).toBe('0');
      expect(parent.getChildren()).not.toContain(child);
      child.destroy();
      parent.destroy();
    });
  },
);

it('composes list and grid child rules and switches to the remaining layout', () => {
  const parent = createFrame();
  const list = createUIListLayout({ SortOrder: 'Name' });
  const grid = createUIGridLayout();
  list.Parent = parent;
  grid.Parent = parent;
  const first = createFrame({ Name: 'Zebra', LayoutOrder: 1 });
  const second = createFrame({ Name: 'Alpha', LayoutOrder: 2 });
  first.Parent = parent;
  second.Parent = parent;

  expect([...parent.unsafeElement.children]).toEqual([first.unsafeElement, second.unsafeElement]);
  expect(second.unsafeElement.style.flexShrink).toBe('0');
  expect(second.unsafeElement.style.width).toBe('100%');
  grid.destroy();
  const middle = createFrame({ Name: 'Middle' });
  middle.Parent = parent;

  expect([...parent.unsafeElement.children]).toEqual(
    [second, middle, first].map((child) => child.unsafeElement),
  );
  expect(middle.unsafeElement.style.width).toBe('100px');
  parent.destroy();
});
