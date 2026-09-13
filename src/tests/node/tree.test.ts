import { describe, expect, it, vi } from 'vitest';

import { fk } from '../../index';

describe('tree', () => {
  it('tracks, reparents, finds, and destroys children', () => {
    const first = fk.createFrame({ Name: 'First' });
    const second = fk.createFrame({ Name: 'Second' });
    const child = fk.createFrame({ Name: 'Child' });
    const grandchild = fk.createFrame({ Name: 'Grandchild' });

    first.addChild(child);
    child.addChild(grandchild);

    expect(first.getChildren()).toEqual([child]);
    expect(first.findFirstChild('Grandchild', true)).toBe(grandchild);
    expect(first.getDescendants()).toEqual([child, grandchild]);
    expect(grandchild.getFullName()).toBe('First.Child.Grandchild');
    expect(child.ClassName).toBe('Frame');

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
    const root = fk.createFrame();
    const child = fk.createFrame();

    root.addChild(child);

    expect(() => child.addChild(root)).toThrow(/descendants/);
    expect(() => (root.Parent = child)).toThrow(/descendants/);

    child.destroy();

    expect(() => child.setProperties({ Name: 'Too late' })).toThrow(/destroyed/);
  });

  it('formats and prints a stable hierarchy snapshot', () => {
    const root = fk.createFrame({ Name: 'Root' });
    const first = fk.createFrame({ Name: 'First' });
    const second = fk.createFrame({ Name: 'Second' });
    const grandchild = fk.createFrame({ Name: 'Grandchild' });

    root.addChild(first);
    root.addChild(second);
    first.addChild(grandchild);

    const expected = [
      'Root [Frame]',
      '├─ First [Frame]',
      '│  └─ Grandchild [Frame]',
      '└─ Second [Frame]',
    ].join('\n');

    expect(root.toTreeString()).toBe(expected);

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    root.printTree();

    expect(log).toHaveBeenCalledWith(expected);

    log.mockRestore();
  });
});
