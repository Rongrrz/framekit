import { describe, expect, it, vi } from 'vitest';

import { fk } from '../../index';
import { resetDocumentAfterEach } from '../support/reset-document';

resetDocumentAfterEach();

describe('DOM cleanup', () => {
  it('removes an owned DOM subtree once while cleaning externally moved descendants', () => {
    const root = fk.createFrame();
    const nested = fk.createFrame();
    const moved = fk.createFrame();
    const nestedRemove = vi.spyOn(nested.element, 'remove');
    const movedRemove = vi.spyOn(moved.element, 'remove');

    root.addChild(nested);
    root.addChild(moved);
    document.body.append(moved.element);

    root.destroy();

    expect(nestedRemove).not.toHaveBeenCalled();
    expect(movedRemove).toHaveBeenCalledOnce();
    expect(document.body.contains(moved.element)).toBe(false);
    expect(nested.isDestroyed()).toBe(true);
    expect(moved.isDestroyed()).toBe(true);
  });
});

describe('resource cleanup', () => {
  it('reports every cleanup failure after destroying the complete subtree', () => {
    const root = fk.createFrame();
    const child = fk.createFrame();
    const childFailure = new Error('child cleanup failed');
    const rootFailure = new Error('root cleanup failed');
    const finalCleanup = vi.fn();

    root.addChild(child);
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
    const root = fk.createFrame({ Name: 'Root' });
    const first = fk.createFrame({ Name: 'First' });
    const second = fk.createFrame({ Name: 'Second' });
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
    const node = fk.createFrame();
    const cleanup = vi.fn();
    const unregister = node.onDestroy(cleanup);

    unregister();
    node.destroy();

    expect(cleanup).not.toHaveBeenCalled();
  });
});
