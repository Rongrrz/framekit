import { describe, expect, it, vi } from 'vitest';

import { groupNode } from '../../support/group-node';

describe('tree', () => {
  it('tracks, reparents, finds, and destroys children', () => {
    const first = groupNode({ Name: 'First' });
    const second = groupNode({ Name: 'Second' });
    const child = groupNode({ Name: 'Child' });
    const grandchild = groupNode({ Name: 'Grandchild' });

    first.addChild(child);
    child.addChild(grandchild);

    expect(first.getChildren()).toEqual([child]);
    expect(first.findFirstChild('Grandchild', true)).toBe(grandchild);
    expect(first.getDescendants()).toEqual([child, grandchild]);
    expect(grandchild.getFullName()).toBe('First.Child.Grandchild');
    expect(child.ClassName).toBe('Group');

    child.Parent = second;

    expect(first.getChildren()).toEqual([]);
    expect(second.getChildren()).toEqual([child]);
    expect(child.Parent).toBe(second);

    child.Parent = undefined;

    expect(second.getChildren()).toEqual([]);
    expect(child.Parent).toBeUndefined();

    second.addChild(child);
    second.destroy();

    expect(child.isDestroyed()).toBe(true);
    expect(grandchild.isDestroyed()).toBe(true);
  });

  it('rejects cycles and mutations after destruction', () => {
    const root = groupNode();
    const child = groupNode();

    root.addChild(child);

    expect(() => child.addChild(root)).toThrow(/descendants/);
    expect(() => (root.Parent = child)).toThrow(/descendants/);

    child.destroy();

    expect(() => child.setProperties({ Name: 'Too late' })).toThrow(/destroyed/);
  });

  it('formats and prints a stable hierarchy snapshot', () => {
    const root = groupNode({ Name: 'Root' });
    const first = groupNode({ Name: 'First' });
    const second = groupNode({ Name: 'Second' });
    const grandchild = groupNode({ Name: 'Grandchild' });

    root.addChild(first);
    root.addChild(second);
    first.addChild(grandchild);

    const expected = [
      'Root [Group]',
      '├─ First [Group]',
      '│  └─ Grandchild [Group]',
      '└─ Second [Group]',
    ].join('\n');

    expect(root.toTreeString()).toBe(expected);

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    root.printTree();

    expect(log).toHaveBeenCalledWith(expected);

    log.mockRestore();
  });

  it('finishes destroying a subtree when one cleanup fails', () => {
    const root = groupNode({ Name: 'Root' });
    const first = groupNode({ Name: 'First' });
    const second = groupNode({ Name: 'Second' });
    const completedCleanup = vi.fn();

    root.addChild(first);
    root.addChild(second);
    first.onDestroy(() => {
      throw new Error('cleanup failed');
    });
    first.onDestroy(completedCleanup);
    second.onDestroy(completedCleanup);

    expect(() => root.destroy()).toThrow(/cleanup failed/);
    expect(completedCleanup).toHaveBeenCalledTimes(2);
    expect(root.isDestroyed()).toBe(true);
    expect(first.isDestroyed()).toBe(true);
    expect(second.isDestroyed()).toBe(true);
  });

  it('allows registered destruction work to be unregistered', () => {
    const node = groupNode();
    const cleanup = vi.fn();
    const unregister = node.onDestroy(cleanup);

    unregister();
    node.destroy();

    expect(cleanup).not.toHaveBeenCalled();
  });
});
