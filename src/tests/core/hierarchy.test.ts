import { describe, expect, it, vi } from 'vitest';

import { fk } from '../../index.js';

describe('hierarchy', () => {
  it('tracks, reparents, finds, and destroys children', () => {
    const first = fk.createFrame({ Name: 'First' });
    const second = fk.createFrame({ Name: 'Second' });
    const child = fk.createFrame({ Name: 'Child' });
    const grandchild = fk.createFrame({ Name: 'Grandchild' });

    child.Parent = first;
    grandchild.Parent = child;

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

    child.Parent = second;
    second.destroy();

    expect(child.isDestroyed()).toBe(true);
    expect(grandchild.isDestroyed()).toBe(true);
  });

  it('rejects cycles and mutations after destruction', () => {
    const root = fk.createFrame();
    const child = fk.createFrame();

    child.Parent = root;

    expect(() => (root.Parent = child)).toThrow(/descendants/);
    expect(() => (root.Parent = child)).toThrow(/descendants/);

    child.destroy();

    expect(() => child.setProperties({ Name: 'Too late' })).toThrow(/destroyed/);
  });

  it('narrows heterogeneous traversal results to their concrete APIs', () => {
    const parent = fk.createFrame();
    const button = fk.createTextButton({ Name: 'Action' });
    button.Parent = parent;
    const child = parent.findFirstChild('Action');

    if (!child?.isA('TextButton')) throw new Error('Expected a TextButton.');
    child.Text = 'Run';
    child.onClick(() => undefined);

    expect(button.Text).toBe('Run');
    expect(child.isA('ImageButton')).toBe(false);
  });

  it('rolls back hierarchy state when DOM placement fails', () => {
    const parent = fk.createFrame();
    const child = fk.createFrame();

    vi.spyOn(parent.unsafeElement, 'insertBefore').mockImplementation(() => {
      throw new Error('DOM placement failed');
    });

    expect(() => (child.Parent = parent)).toThrow(/DOM placement failed/);
    expect(child.Parent).toBeUndefined();
    expect(parent.getChildren()).toEqual([]);
    expect(child.unsafeElement.parentElement).toBeNull();
  });

  it('formats a stable hierarchy snapshot', () => {
    const root = fk.createFrame({ Name: 'Root' });
    const first = fk.createFrame({ Name: 'First' });
    const second = fk.createFrame({ Name: 'Second' });
    const grandchild = fk.createFrame({ Name: 'Grandchild' });

    first.Parent = root;
    second.Parent = root;
    grandchild.Parent = first;

    const expected = [
      'Root [Frame]',
      '├─ First [Frame]',
      '│  └─ Grandchild [Frame]',
      '└─ Second [Frame]',
    ].join('\n');

    expect(root.toTreeString()).toBe(expected);
  });
});
