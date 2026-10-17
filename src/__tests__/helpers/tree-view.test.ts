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

it('rejects invalid rows before modifying semantics or retaining a subscription', () => {
  const root = createFrame();
  const foreign = createTextButton();
  root.unsafeElement.setAttribute('role', 'navigation');

  const source = createObservableValue<readonly TreeViewItem[]>([
    { node: foreign, level: 1, label: 'Foreign' },
  ]);

  expect(() => bindTreeView(root, source, { onSelect: vi.fn(), onToggle: vi.fn() })).toThrow(
    /live descendants/,
  );
  expect(root.unsafeElement.getAttribute('role')).toBe('navigation');
  expect(foreign.unsafeElement.hasAttribute('role')).toBe(false);
  source.set([]);
  expect(root.unsafeElement.getAttribute('role')).toBe('navigation');
  root.destroy();
  foreign.destroy();
});

it('selects the deepest row for a nested DOM target and rejects hidden descendants', () => {
  const root = createFrame();
  const folder = createFrame();
  const child = createTextButton({ Text: 'Child' });
  folder.Parent = root;
  child.Parent = folder;
  document.body.append(root.unsafeElement);

  const rows: readonly TreeViewItem[] = [
    { node: folder, label: 'Folder', level: 1, expanded: true },
    { node: child, label: 'Child', level: 2 },
  ];

  const source = createObservableValue(rows);
  const onSelect = vi.fn();
  const stop = bindTreeView(root, source, { onSelect, onToggle: vi.fn() });
  child.unsafeElement.click();
  expect(onSelect).toHaveBeenCalledExactlyOnceWith(child);
  expect(child.unsafeElement.tabIndex).toBe(0);

  const reported = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  source.set([{ ...rows[0]!, expanded: false }, rows[1]!]);
  expect(reported).toHaveBeenCalledWith(
    'Unhandled FrameKit observer error.',
    expect.any(TypeError),
  );
  reported.mockRestore();
  expect(folder.unsafeElement.getAttribute('aria-expanded')).toBe('true');
  stop();
  root.destroy();
});

it('keeps one tab stop through refresh and reorder, restoring removed rows before moving focus', () => {
  const root = createFrame();
  const rows = ['First', 'Second', 'Third'].map((label, index) => {
    const node = createTextButton({ Text: label });
    node.unsafeElement.tabIndex = index + 7;
    node.Parent = root;

    return { node, label, level: 1 };
  });

  document.body.append(root.unsafeElement);

  const source = createObservableValue<readonly TreeViewItem[]>(rows);
  const dispose = bindTreeView(root, source, { onSelect: vi.fn(), onToggle: vi.fn() });
  rows[0]!.node.focus();
  rows[0]!.node.unsafeElement.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
  );
  source.set([...rows]);
  expect(rows.map(({ node }) => node.unsafeElement.tabIndex)).toEqual([-1, 0, -1]);

  source.set([rows[0]!, rows[2]!]);
  expect(rows[1]!.node.unsafeElement.tabIndex).toBe(8);
  expect(rows[1]!.node.unsafeElement.hasAttribute('role')).toBe(false);
  expect(document.activeElement).toBe(rows[2]!.node.unsafeElement);
  expect(rows[0]!.node.unsafeElement.tabIndex).toBe(-1);

  source.set([rows[2]!, rows[0]!]);
  expect(document.activeElement).toBe(rows[2]!.node.unsafeElement);
  expect(rows[2]!.node.unsafeElement.tabIndex).toBe(0);
  expect(rows[0]!.node.unsafeElement.tabIndex).toBe(-1);
  dispose();
  expect(rows.map(({ node }) => node.unsafeElement.tabIndex)).toEqual([7, 8, 9]);
  root.destroy();
});
