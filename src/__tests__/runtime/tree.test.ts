import { describe, expect, it } from 'vitest';

import { append, children, destroy, find, isDestroyed, parent, update } from '../..';
import { groupNode } from '../helpers/group-node';

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
});
