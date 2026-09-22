import { createFrame, createObservableValue } from 'framekit';
import { describe, expect, it, vi } from 'vitest';

import { watchOwnedValue } from '../src/owned-value';

describe('owned value subscriptions', () => {
  it('publishes immediately and stops when its owner is destroyed', () => {
    const owner = createFrame();
    const value = createObservableValue(1);
    const listener = vi.fn();
    watchOwnedValue(owner, value, listener);
    value.set(2);
    owner.destroy();
    value.set(3);
    expect(listener.mock.calls).toEqual([[1], [2]]);
  });

  it('can be disposed repeatedly without destroying the owner', () => {
    const owner = createFrame();
    const value = createObservableValue(1);
    const listener = vi.fn();
    const dispose = watchOwnedValue(owner, value, listener);
    dispose();
    dispose();
    value.set(2);
    expect(listener.mock.calls).toEqual([[1]]);
    expect(owner.isDestroyed()).toBe(false);
    owner.destroy();
  });

  it('rejects a destroyed owner before notifying the listener', () => {
    const owner = createFrame();
    owner.destroy();
    const listener = vi.fn();
    expect(() => watchOwnedValue(owner, createObservableValue(1), listener)).toThrow(/destroyed/);
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not subscribe when the immediate listener destroys its owner', () => {
    const owner = createFrame();
    const value = createObservableValue(1);
    const listener = vi.fn(() => owner.destroy());
    const dispose = watchOwnedValue(owner, value, listener);
    value.set(2);
    dispose();
    expect(listener).toHaveBeenCalledOnce();
  });
});
