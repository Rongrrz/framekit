import { createFrame, createObservableValue } from 'framekit';
import { describe, expect, it, vi } from 'vitest';

import { watchOwnedValue } from '../../helpers/owned-value.js';

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

it('subscribes before immediate delivery so reentrant updates are not lost', () => {
  const owner = createFrame();
  const value = createObservableValue(1);
  const seen: number[] = [];
  watchOwnedValue(owner, value, (next) => {
    seen.push(next);

    if (next === 1) {
      value.set(2);
    }
  });
  expect(seen).toEqual([1, 2]);
  owner.destroy();
});

it('releases the subscription when initial delivery fails', () => {
  const owner = createFrame();
  const value = createObservableValue(1);

  const listener = vi.fn(() => {
    throw new Error('initial delivery');
  });

  expect(() => watchOwnedValue(owner, value, listener)).toThrow('initial delivery');
  value.set(2);
  expect(listener).toHaveBeenCalledOnce();
  owner.destroy();
});

it('keeps detached owners subscribed until destruction', () => {
  const parent = createFrame();
  const owner = createFrame();
  owner.Parent = parent;

  const value = createObservableValue(1);
  watchOwnedValue(owner, value, (next) => {
    owner.Name = String(next);
  });
  owner.Parent = undefined;
  value.set(2);
  expect(owner.Name).toBe('2');
  owner.destroy();
  value.set(3);
  parent.destroy();
});
