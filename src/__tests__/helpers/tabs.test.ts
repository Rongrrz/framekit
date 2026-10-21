import { bindTabs, createFrame, createObservableValue, createTextButton } from 'framekit';
import { expect, it } from 'vitest';

import { destroyNodesAfterEach } from '../support/node-cleanup.js';

const own = destroyNodesAfterEach();

const createTabs = () => {
  const root = own(createFrame());
  const items = ['first', 'second', 'third'].map((key) => {
    const tab = own(createTextButton({ Text: key }));
    tab.Parent = root;

    return { key, tab, panel: own(createFrame()) };
  });
  const selection = createObservableValue('first');

  return { root, items, selection };
};

it('connects existing tabs and panels and uses caller selection without replacing content', () => {
  const { root, items, selection } = createTabs();
  bindTabs(root, items, { selection });
  const first = items[0]!;
  const second = items[1]!;
  expect(first.tab.ClassName).toBe('TextButton');
  expect(first.panel.ClassName).toBe('Frame');
  expect(first.tab.unsafeElement.getAttribute('aria-controls')).toBe(first.panel.unsafeElement.id);
  expect(first.panel.unsafeElement.getAttribute('aria-labelledby')).toBe(
    first.tab.unsafeElement.id,
  );
  expect(first.panel.Visible).toBe(true);
  expect(second.panel.Visible).toBe(false);
  second.tab.unsafeElement.click();
  expect(selection.get()).toBe('second');
  expect(first.panel.Visible).toBe(false);
  selection.set('third');
  expect(items[2]!.panel.Visible).toBe(true);
  expect(second.tab.unsafeElement.tabIndex).toBe(-1);
});

it('wraps arrows past disabled tabs and only handles the configured axis', () => {
  const { root, items, selection } = createTabs();
  items[1]!.tab.Disabled = true;
  bindTabs(root, items, { selection, orientation: 'Vertical' });
  const press = (index: number, key: string): void => {
    items[index]!.tab.unsafeElement.dispatchEvent(
      new KeyboardEvent('keydown', { key, cancelable: true }),
    );
  };

  press(0, 'ArrowRight');
  expect(selection.get()).toBe('first');
  press(0, 'ArrowDown');
  expect(selection.get()).toBe('third');
  press(2, 'ArrowDown');
  expect(selection.get()).toBe('first');
  press(0, 'End');
  expect(selection.get()).toBe('third');
  items[2]!.tab.Disabled = true;
  expect(items[0]!.tab.unsafeElement.tabIndex).toBe(0);
});

it('restores attributes and original visibility and releases the whole binding on part destruction', () => {
  const { root, items, selection } = createTabs();
  const first = items[0]!;
  first.tab.unsafeElement.id = 'caller-tab';
  first.panel.Visible = false;
  const dispose = bindTabs(root, items, { selection });
  items[2]!.panel.destroy();
  dispose();
  selection.set('second');
  expect(root.unsafeElement.hasAttribute('role')).toBe(false);
  expect(first.tab.unsafeElement.id).toBe('caller-tab');
  expect(first.panel.unsafeElement.id).toBe('');
  expect(first.panel.Visible).toBe(false);
  expect(items[1]!.panel.Visible).toBe(true);
  expect(items[1]!.tab.isDestroyed()).toBe(false);
});

it('rejects duplicate keys, unknown selection, and nested panels before changing semantics', () => {
  const { root, items, selection } = createTabs();
  expect(() => bindTabs(root, [items[0]!, items[0]!], { selection })).toThrow();
  selection.set('missing');
  expect(() => bindTabs(root, items, { selection })).toThrow(/selection/);
  selection.set('first');
  items[1]!.panel.Parent = items[0]!.panel;
  expect(() => bindTabs(root, items, { selection })).toThrow(/panels/);
  expect(root.unsafeElement.hasAttribute('role')).toBe(false);
  expect(items[0]!.panel.unsafeElement.id).toBe('');
});

it('honors selection changes made synchronously by panel property observers', () => {
  const { root, items, selection } = createTabs();
  bindTabs(root, items, { selection });
  items[0]!.panel.onPropertyChanged('Visible', (visible) => {
    if (!visible) {
      selection.set('third');
    }
  });
  selection.set('second');
  expect(selection.get()).toBe('third');
  expect(items.map(({ panel }) => panel.Visible)).toEqual([false, false, true]);
  expect(items.map(({ tab }) => tab.unsafeElement.getAttribute('aria-selected'))).toEqual([
    'false',
    'false',
    'true',
  ]);
});
