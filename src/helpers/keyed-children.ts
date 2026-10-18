import { runCleanups, throwCollectedErrors } from '#internal/errors.js';
import type { GuiElement } from '#internal/runtime/node/gui-node.js';
import type { Instance } from '#internal/runtime/node/instance.js';
import type { Unsubscribe } from '#state/signal.js';
import type { ReadonlyObservableValue } from '#state/value.js';

import { watchOwnedValue } from './owned-value.js';

/** Factories produce unattached views; the binding owns their placement and destruction. */
export type KeyedChildrenOptions<Item, Node extends GuiElement> = Readonly<{
  key: (item: Item) => string | number;
  create: (item: Item) => Node;
  /** Runs for new and retained views. Callback mutations are not rolled back on failure. */
  update?: (node: Node, item: Item, index: number) => void;
}>;

/**
 * Reconciles one parent's children by stable key. Duplicate keys are rejected before views
 * change. Retained views keep identity; removal, disposal, and parent destruction release
 * generated views. Do not independently reparent or destroy views owned by this binding.
 */
export const bindKeyedChildren = <Item, Node extends GuiElement>(
  parent: GuiElement,
  source: ReadonlyObservableValue<readonly Item[]>,
  options: KeyedChildrenOptions<Item, Node>,
): Unsubscribe => {
  let views = new Map<string | number, Node>();
  let disposed = false;
  let updating = false;
  let pending: readonly Item[] | undefined;
  let stopWatching: Unsubscribe = () => undefined;

  const dispose = (): void => {
    if (disposed) {
      return;
    }

    disposed = true;
    pending = undefined;

    const owned = [...views.values()];
    views.clear();
    runCleanups(
      [unregisterDestroy, stopWatching, () => destroyViews(owned)],
      'Multiple keyed children cleanups failed.',
    );
  };

  const unregisterDestroy = parent.onDestroy(dispose);

  const reconcile = (items: readonly Item[]): void => {
    const keys = items.map(options.key);

    if (new Set(keys).size !== keys.length) {
      throw new TypeError('Keyed children require unique keys.');
    }

    const next = new Map<string | number, Node>();
    const created: Node[] = [];
    const identities = new Set(views.values());

    try {
      for (const [index, item] of items.entries()) {
        const key = keys[index]!;
        let node = views.get(key);

        if (node) {
          if (node.isDestroyed() || node.Parent !== parent) {
            throw new Error('A keyed child was destroyed or reparented outside its binding.');
          }
        } else {
          node = options.create(item);

          validateChildView(parent, node, identities);

          created.push(node);
          identities.add(node);
        }

        next.set(key, node);
        options.update?.(node, item, index);

        if (disposed) {
          destroyViews(created);

          return;
        }
      }

      for (const node of created) {
        node.Parent = parent;
      }

      const owned = new Set([...views.values(), ...next.values()]);
      const unmanaged = parent.getChildren().filter((child) => !owned.has(child as Node));
      const removed = [...views].filter(([key]) => !next.has(key)).map(([, node]) => node);
      parent.reorderChildren([...unmanaged, ...next.values(), ...removed]);
      views = next;
      // The authoritative map changes first so teardown callbacks see the committed list.
      destroyViews(removed);
    } catch (error) {
      const errors = [error];

      try {
        destroyViews(created.filter((node) => ![...views.values()].includes(node)));
      } catch (cleanupError) {
        errors.push(cleanupError);
      }

      throwCollectedErrors(errors, 'Keyed children update and cleanup failed.');
    }
  };

  const update = (items: readonly Item[]): void => {
    pending = items;

    if (updating || disposed) {
      return;
    }

    updating = true;

    try {
      while (pending && !disposed) {
        const next = pending;
        pending = undefined;
        reconcile(next);
      }
    } finally {
      updating = false;
    }
  };

  try {
    stopWatching = watchOwnedValue(parent, source, update);

    if (disposed) {
      stopWatching();
    }
  } catch (error) {
    try {
      dispose();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Keyed children setup and cleanup failed.');
    }

    throw error;
  }

  return dispose;
};

/** Checks ownership before a collection adds attributes, listeners, or cleanup to a view. */
export const validateChildView = (
  parent: GuiElement,
  node: GuiElement,
  existing: ReadonlySet<GuiElement>,
): void => {
  if (node.isDestroyed() || node.Parent || existing.has(node)) {
    throw new TypeError('A child factory must return a unique, live, unattached view.');
  }

  for (let ancestor: Instance | undefined = parent; ancestor; ancestor = ancestor.Parent) {
    if (ancestor === node) {
      throw new TypeError('A child factory cannot return its parent or an ancestor.');
    }
  }
};

const destroyViews = (nodes: readonly GuiElement[]): void => {
  runCleanups(
    nodes.map((node) => () => node.destroy()),
    'Multiple keyed child cleanups failed.',
  );
};
