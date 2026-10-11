import {
  bindTreeView,
  createFrame,
  createObservableValue,
  createTextButton,
  type TreeViewItem,
} from 'framekit';
import { expect, it, vi } from 'vitest';

it('owns tree semantics and supports arrows, typeahead, selection, and expansion', () => {
  const root = createFrame();
  const rows = ['Folder', 'Alpha', 'Beta'].map((Text) => createTextButton({ Text }));
  rows.forEach((row) => {
    row.Parent = root;
  });
  document.body.append(root.unsafeElement);
  const source = createObservableValue<readonly TreeViewItem[]>(
    rows.map((node, index) => ({
      node,
      label: node.Text,
      level: index === 0 ? 1 : 2,
      ...(index === 0 ? { expanded: true } : {}),
    })),
  );
  const onSelect = vi.fn();
  const onToggle = vi.fn();
  const dispose = bindTreeView(root, source, { onSelect, onToggle });
  rows[0]!.focus();
  const key = (value: string): void => {
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }),
    );
  };
  key('ArrowDown');
  expect(document.activeElement).toBe(rows[1]!.unsafeElement);
  key('b');
  expect(document.activeElement).toBe(rows[2]!.unsafeElement);
  key('Enter');
  expect(onSelect).toHaveBeenCalledWith(rows[2]);
  key('ArrowLeft');
  expect(document.activeElement).toBe(rows[0]!.unsafeElement);
  key('ArrowLeft');
  expect(onToggle).toHaveBeenCalledWith(rows[0], false);
  expect(rows[2]!.unsafeElement.getAttribute('aria-posinset')).toBe('2');
  expect(rows[2]!.unsafeElement.getAttribute('aria-setsize')).toBe('2');
  dispose();
  expect(root.unsafeElement.hasAttribute('role')).toBe(false);
  expect(root.unsafeElement.hasAttribute('tabindex')).toBe(false);
  expect(rows[0]!.unsafeElement.hasAttribute('role')).toBe(false);
  root.destroy();
});
