import type { GuiElement } from '#internal/runtime/node/gui-node.js';
import type { Unsubscribe } from '#state/signal.js';
import type { ReadonlyObservableValue } from '#state/value.js';

import { createTypeahead, isTextEntry } from './composite-keyboard.js';
import { watchOwnedValue } from './owned-value.js';

/** One visible row in a depth-first tree. Collapsed descendants are omitted by the caller. */
export type TreeViewItem = Readonly<{
  node: GuiElement;
  level: number;
  label: string;
  selected?: boolean;
  /** Omit for leaves. */
  expanded?: boolean;
}>;

/** Selection and expansion remain application state rather than hidden widget state. */
export type TreeViewOptions = Readonly<{
  onSelect: (node: GuiElement) => void;
  onToggle: (node: GuiElement, expanded: boolean) => void;
}>;

/** Adds single-selection tree semantics, roving focus, typeahead, and keyboard navigation. */
export const bindTreeView = (
  root: GuiElement,
  source: ReadonlyObservableValue<readonly TreeViewItem[]>,
  options: TreeViewOptions,
): Unsubscribe => {
  const element = root.unsafeElement;
  const role = element.getAttribute('role');
  const rootTabIndex = element.getAttribute('tabindex');
  let items: readonly TreeViewItem[] = [];
  let active: GuiElement | undefined;
  let focusWithin = false;

  const attributes = [
    'role',
    'tabindex',
    'aria-level',
    'aria-expanded',
    'aria-selected',
    'aria-posinset',
    'aria-setsize',
  ];

  const originals = new Map<GuiElement, (string | null)[]>();
  const typeahead = createTypeahead();

  const restore = (node: GuiElement): void => {
    const saved = originals.get(node);
    saved?.forEach((value, index) => {
      const name = attributes[index]!;

      if (value === null) {
        node.unsafeElement.removeAttribute(name);
      } else {
        node.unsafeElement.setAttribute(name, value);
      }
    });
    originals.delete(node);
  };

  const setActive = (node: GuiElement, focus: boolean): void => {
    active = node;

    for (const item of items) {
      item.node.unsafeElement.tabIndex = item.node === active ? 0 : -1;
    }

    if (focus) {
      node.focus();
      node.unsafeElement.scrollIntoView({ block: 'nearest' });
    }
  };

  const stopWatching = watchOwnedValue(root, source, (next) => {
    if (
      new Set(next.map((item) => item.node)).size !== next.length ||
      next.some(
        (item, index) =>
          item.node.isDestroyed() ||
          item.node === root ||
          !element.contains(item.node.unsafeElement) ||
          !Number.isInteger(item.level) ||
          item.level < 1 ||
          item.level > (index === 0 ? 1 : next[index - 1]!.level + 1) ||
          (index > 0 && item.level > next[index - 1]!.level && next[index - 1]!.expanded !== true),
      )
    ) {
      throw new TypeError(
        'Tree rows must be unique live descendants with visible depth-first levels starting at 1.',
      );
    }

    element.setAttribute('role', 'tree');

    const previousIndex = items.findIndex((item) => item.node === active);

    for (const node of originals.keys()) {
      if (!next.some((item) => item.node === node)) {
        restore(node);
      }
    }

    items = next;

    const groups = new Map<GuiElement | undefined, TreeViewItem[]>();
    const ancestors: GuiElement[] = [];

    for (const item of items) {
      ancestors.length = item.level - 1;

      const parent = ancestors.at(-1);
      const siblings = groups.get(parent) ?? [];
      siblings.push(item);
      groups.set(parent, siblings);
      ancestors.push(item.node);

      const child = item.node.unsafeElement;

      if (!originals.has(item.node)) {
        originals.set(
          item.node,
          attributes.map((name) => child.getAttribute(name)),
        );
      }

      child.setAttribute('role', 'treeitem');
      child.setAttribute('aria-level', String(item.level));
      child.setAttribute('aria-selected', String(item.selected ?? false));

      if (item.expanded === undefined) {
        child.removeAttribute('aria-expanded');
      } else {
        child.setAttribute('aria-expanded', String(item.expanded));
      }
    }

    for (const siblings of groups.values()) {
      siblings.forEach((item, index) => {
        item.node.unsafeElement.setAttribute('aria-posinset', String(index + 1));
        item.node.unsafeElement.setAttribute('aria-setsize', String(siblings.length));
      });
    }

    const retained = items.find((item) => item.node === active);
    const fallback = items[Math.max(0, Math.min(previousIndex, items.length - 1))];
    const chosen = retained ?? items.find((item) => item.selected) ?? fallback;

    if (chosen) {
      setActive(chosen.node, !retained && focusWithin);
    } else {
      active = undefined;
      element.tabIndex = 0;

      if (focusWithin) {
        root.focus();
      }
    }

    if (items.length > 0) {
      element.tabIndex = -1;
    }
  });

  const subscriptions = [
    root.on('focusin', (event) => {
      focusWithin = true;

      const item = items.findLast((item) => item.node.unsafeElement.contains(event.target as Node));

      if (item) {
        setActive(item.node, false);
      }
    }),
    root.on('focusout', (event) => {
      if (event.relatedTarget && !element.contains(event.relatedTarget as Node)) {
        focusWithin = false;
      }
    }),
    root.on('click', (event) => {
      if (isTextEntry(event.target)) {
        return;
      }

      const item = items.findLast((item) => item.node.unsafeElement.contains(event.target as Node));

      if (item) {
        setActive(item.node, true);
        options.onSelect(item.node);
      }
    }),
    root.on('keydown', (event) => {
      if (
        event.defaultPrevented ||
        isTextEntry(event.target) ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.isComposing
      ) {
        return;
      }

      const index = items.findIndex((item) => item.node === active);
      const item = items[index];

      if (!item) {
        return;
      }

      let next: number | undefined;

      if (event.key === 'ArrowDown') {
        next = Math.min(index + 1, items.length - 1);
      } else if (event.key === 'ArrowUp') {
        next = Math.max(index - 1, 0);
      } else if (event.key === 'Home') {
        next = 0;
      } else if (event.key === 'End') {
        next = items.length - 1;
      } else if (event.key === 'ArrowRight') {
        if (item.expanded === false) {
          options.onToggle(item.node, true);
        } else if (items[index + 1]?.level === item.level + 1) {
          next = index + 1;
        }
      } else if (event.key === 'ArrowLeft') {
        if (item.expanded) {
          options.onToggle(item.node, false);
        } else {
          next = items.findLastIndex(
            (candidate, candidateIndex) => candidateIndex < index && candidate.level < item.level,
          );
        }
      } else if (event.key === 'Enter' || event.key === ' ') {
        options.onSelect(item.node);
      } else {
        next = typeahead(
          items.map((candidate) => candidate.label),
          index,
          event,
        );

        if (next === undefined) {
          return;
        }
      }

      event.preventDefault();

      if (next !== undefined && next >= 0) {
        setActive(items[next]!.node, true);
      }
    }),
  ];

  let disposed = false;

  const dispose = (): void => {
    if (disposed) {
      return;
    }

    disposed = true;
    unregisterDestroy();
    stopWatching();
    subscriptions.forEach((stop) => stop());

    for (const node of originals.keys()) {
      restore(node);
    }

    items = [];
    active = undefined;

    if (role === null) {
      element.removeAttribute('role');
    } else {
      element.setAttribute('role', role);
    }

    if (rootTabIndex === null) {
      element.removeAttribute('tabindex');
    } else {
      element.setAttribute('tabindex', rootTabIndex);
    }
  };

  const unregisterDestroy = root.onDestroy(dispose);

  return dispose;
};
