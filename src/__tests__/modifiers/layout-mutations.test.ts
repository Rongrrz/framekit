import { createFrame, createUIGridLayout, createUIListLayout, udim2FromOffset } from 'framekit';
import { describe, expect, it, vi } from 'vitest';

import { resetDocumentAfterEach } from '../support/reset-document.js';

resetDocumentAfterEach();

describe.each([createUIListLayout, createUIGridLayout])(
  'active layout insertion (%#)',
  (createLayout) => {
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
