import { describe, expect, it, vi } from 'vitest';

import { fk } from '../..';
import { groupNode } from '../helpers/group-node';

const { append, children, destroy, find, isDestroyed, onDestroy, parent, update } = fk;

describe('tree', () => {
  it('tracks, reparents, finds, and destroys children', () => {
    const first = groupNode({ Name: 'First' });
    const second = groupNode({ Name: 'Second' });
    const child = groupNode({ Name: 'Child' });
    const grandchild = groupNode({ Name: 'Grandchild' });
    append(first, child);
    append(child, grandchild);
    expect(children(first)).toEqual([child]);
    expect(find(first, 'Grandchild', true)).toBe(grandchild);
    append(second, child);
    expect(children(first)).toEqual([]);
    expect(children(second)).toEqual([child]);
    expect(parent(child)).toBe(second);
    destroy(second);
    expect(isDestroyed(child)).toBe(true);
    expect(isDestroyed(grandchild)).toBe(true);
  });

  it('rejects cycles and mutations after destruction', () => {
    const root = groupNode();
    const child = groupNode();
    append(root, child);
    expect(() => append(child, root)).toThrow(/descendants/);
    destroy(child);
    expect(() => update(child, { Name: 'Too late' })).toThrow(/destroyed/);
  });

  it('finishes destroying a subtree when one cleanup fails', () => {
    const root = groupNode({ Name: 'Root' });
    const first = groupNode({ Name: 'First' });
    const second = groupNode({ Name: 'Second' });
    const completedCleanup = vi.fn();
    append(root, first);
    append(root, second);
    onDestroy(first, () => {
      throw new Error('cleanup failed');
    });
    onDestroy(first, completedCleanup);
    onDestroy(second, completedCleanup);

    expect(() => destroy(root)).toThrow(/cleanup failed/);
    expect(completedCleanup).toHaveBeenCalledTimes(2);
    expect(isDestroyed(root)).toBe(true);
    expect(isDestroyed(first)).toBe(true);
    expect(isDestroyed(second)).toBe(true);
  });

  it('allows registered destruction work to be unregistered', () => {
    const node = groupNode();
    const cleanup = vi.fn();
    const unregister = onDestroy(node, cleanup);

    unregister();
    destroy(node);

    expect(cleanup).not.toHaveBeenCalled();
  });
});
