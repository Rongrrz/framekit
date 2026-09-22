import { createFrame, createTextButton } from 'framekit';
import { describe, expect, it, vi } from 'vitest';

describe('hierarchy', () => {
  it('tracks, reparents, finds, and destroys children', () => {
    const first = createFrame({ Name: 'First' });
    const second = createFrame({ Name: 'Second' });
    const child = createFrame({ Name: 'Child' });
    const grandchild = createFrame({ Name: 'Grandchild' });

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
    const root = createFrame();
    const child = createFrame();

    child.Parent = root;

    expect(() => (root.Parent = root)).toThrow(/itself/);
    expect(() => (root.Parent = child)).toThrow(/descendants/);
    expect(root.getChildren()).toEqual([child]);
    expect(child.Parent).toBe(root);

    child.destroy();

    expect(() => child.setProperties({ Name: 'Too late' })).toThrow(/destroyed/);
    expect(() => (child.Parent = root)).toThrow(/destroyed/);
    expect(() => (root.Parent = child)).toThrow(/destroyed/);
  });

  it('narrows heterogeneous traversal results to their concrete APIs', () => {
    const parent = createFrame();
    const button = createTextButton({ Name: 'Action' });
    button.Parent = parent;
    const child = parent.findFirstChild('Action');

    if (!child?.isA('TextButton')) {
      throw new Error('Expected a TextButton.');
    }
    child.Text = 'Run';
    child.onClick(() => undefined);

    expect(button.Text).toBe('Run');
    expect(child.isA('ImageButton')).toBe(false);
  });

  it('rolls back hierarchy state when DOM placement fails', () => {
    const parent = createFrame();
    const child = createFrame();

    vi.spyOn(parent.unsafeElement, 'insertBefore').mockImplementation(() => {
      throw new Error('DOM placement failed');
    });

    expect(() => (child.Parent = parent)).toThrow(/DOM placement failed/);
    expect(child.Parent).toBeUndefined();
    expect(parent.getChildren()).toEqual([]);
    expect(child.unsafeElement.parentElement).toBeNull();
  });

  it('restores the original sibling order when reparenting fails', () => {
    const previous = createFrame();
    const rejected = createFrame();
    const first = createFrame();
    const middle = createFrame();
    const last = createFrame();
    for (const child of [first, middle, last]) {
      child.Parent = previous;
    }
    vi.spyOn(rejected.unsafeElement, 'insertBefore').mockImplementation(() => {
      throw new Error('placement failed');
    });

    expect(() => (middle.Parent = rejected)).toThrow(/placement failed/);
    expect(middle.Parent).toBe(previous);
    expect(previous.getChildren()).toEqual([first, middle, last]);
    expect(Array.from(previous.unsafeElement.children)).toEqual([
      first.unsafeElement,
      middle.unsafeElement,
      last.unsafeElement,
    ]);
    expect(rejected.getChildren()).toEqual([]);
    previous.destroy();
    rejected.destroy();
  });

  it('returns independent traversal snapshots and prefers direct name matches', () => {
    const root = createFrame();
    const branch = createFrame();
    const nested = createFrame({ Name: 'Match' });
    branch.Parent = root;
    nested.Parent = branch;
    const children = root.getChildren();
    const descendants = root.getDescendants();

    expect(root.findFirstChild('Match')).toBeUndefined();
    expect(root.findFirstChild('Match', true)).toBe(nested);
    const direct = createFrame({ Name: 'Match' });
    direct.Parent = root;

    expect(root.findFirstChild('Match', true)).toBe(direct);
    expect(root.findFirstChild('Missing', true)).toBeUndefined();
    expect(children).toEqual([branch]);
    expect(descendants).toEqual([branch, nested]);
    expect(root.getDescendants()).toEqual([branch, nested, direct]);
    root.destroy();
  });

  it('formats a stable hierarchy snapshot', () => {
    const root = createFrame({ Name: 'Root' });
    const first = createFrame({ Name: 'First' });
    const second = createFrame({ Name: 'Second' });
    const grandchild = createFrame({ Name: 'Grandchild' });

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
