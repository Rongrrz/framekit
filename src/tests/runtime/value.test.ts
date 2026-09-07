import { describe, expect, it, vi } from 'vitest';

import { fk } from '../../index';

describe('values', () => {
  it('provides the current value and publishes distinct changes', () => {
    const count = fk.createValue(1);
    const listener = vi.fn();
    const unsubscribe = count.onChange(listener);

    expect(Object.isFrozen(count)).toBe(true);

    count.set(2);
    count.set(2);
    count.update((current) => current + 3);
    unsubscribe();
    count.set(8);

    expect(count.get()).toBe(8);
    expect(listener.mock.calls).toEqual([[2], [5]]);
  });

  it('stores function values without confusing them with updater functions', () => {
    const first = () => 1;
    const second = () => 2;
    const value = fk.createValue(first);

    value.set(second);

    expect(value.get()).toBe(second);
  });

  it('does not publish when an updater returns the current value', () => {
    const value = fk.createValue(2);
    const listener = vi.fn();

    value.onChange(listener);
    value.update((current) => current);

    expect(listener).not.toHaveBeenCalled();
  });

  it('automatically stops node-owned observers on destruction', () => {
    const owner = fk.createFrame();
    const count = fk.createValue(1);
    const listener = vi.fn();

    owner.watch(count, listener);
    count.set(2);
    owner.destroy();
    count.set(3);

    expect(listener.mock.calls).toEqual([[1], [2]]);
  });
});
