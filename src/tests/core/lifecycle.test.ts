import { describe, expect, it, vi } from 'vitest';

import { createFrame } from '../../index.js';
import { resetDocumentAfterEach } from '../support/reset-document.js';

resetDocumentAfterEach();

describe('DOM cleanup', () => {
  it('removes an owned DOM subtree once while cleaning externally moved descendants', () => {
    const root = createFrame();
    const nested = createFrame();
    const moved = createFrame();
    const nestedRemove = vi.spyOn(nested.unsafeElement, 'remove');
    const movedRemove = vi.spyOn(moved.unsafeElement, 'remove');

    nested.Parent = root;
    moved.Parent = root;
    document.body.append(moved.unsafeElement);

    root.destroy();

    expect(nestedRemove).not.toHaveBeenCalled();
    expect(movedRemove).toHaveBeenCalledOnce();
    expect(document.body.contains(moved.unsafeElement)).toBe(false);
    expect(nested.isDestroyed()).toBe(true);
    expect(moved.isDestroyed()).toBe(true);
  });
});

describe('resource cleanup', () => {
  it('reports every cleanup failure after destroying the complete subtree', () => {
    const root = createFrame();
    const child = createFrame();
    const childFailure = new Error('child cleanup failed');
    const rootFailure = new Error('root cleanup failed');
    const finalCleanup = vi.fn();

    child.Parent = root;
    child.onDestroy(() => {
      throw childFailure;
    });
    root.onDestroy(() => {
      throw rootFailure;
    });
    root.onDestroy(finalCleanup);

    expect(() => root.destroy()).toThrow(
      expect.objectContaining({
        errors: [childFailure, rootFailure],
      }),
    );
    expect(root.isDestroyed()).toBe(true);
    expect(child.isDestroyed()).toBe(true);
    expect(finalCleanup).toHaveBeenCalledOnce();

    expect(() => root.destroy()).not.toThrow();
    expect(finalCleanup).toHaveBeenCalledOnce();
  });

  it('finishes destroying a subtree when one cleanup fails', () => {
    const root = createFrame({ Name: 'Root' });
    const first = createFrame({ Name: 'First' });
    const second = createFrame({ Name: 'Second' });
    const completedCleanup = vi.fn();

    first.Parent = root;
    second.Parent = root;
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
    const node = createFrame();
    const cleanup = vi.fn();
    const unregister = node.onDestroy(cleanup);

    unregister();
    node.destroy();

    expect(cleanup).not.toHaveBeenCalled();
  });
});
