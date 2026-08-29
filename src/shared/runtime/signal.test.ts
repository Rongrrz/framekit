import { describe, expect, it, vi } from 'vitest';

import { fk } from '../..';
import { groupNode } from '../../test-support/group-node';

const { createSignal, createValue } = fk;

describe('signals', () => {
  it('subscribes with an idempotent unsubscribe function', () => {
    const event = createSignal<[number]>();

    expect(Object.isFrozen(event)).toBe(true);

    const listener = vi.fn();
    const unsubscribe = event.subscribe(listener);

    event.emit(1);
    unsubscribe();
    unsubscribe();
    event.emit(2);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(1);
  });

  it('uses an emission snapshot and can clear every subscriber', () => {
    const event = createSignal();
    const lateSubscriber = vi.fn();
    const firstSubscriber = vi.fn(() => event.subscribe(lateSubscriber));

    event.subscribe(firstSubscriber);
    event.emit();

    expect(lateSubscriber).not.toHaveBeenCalled();

    event.emit();

    expect(lateSubscriber).toHaveBeenCalledOnce();

    event.clear();
    event.emit();

    expect(firstSubscriber).toHaveBeenCalledTimes(2);
    expect(lateSubscriber).toHaveBeenCalledOnce();
  });
});

describe('values', () => {
  it('provides the current value and publishes distinct changes', () => {
    const count = createValue(1);
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
    const value = createValue(first);

    value.set(second);

    expect(value.get()).toBe(second);
  });

  it('does not publish when an updater returns the current value', () => {
    const value = createValue(2);
    const listener = vi.fn();

    value.onChange(listener);
    value.update((current) => current);

    expect(listener).not.toHaveBeenCalled();
  });

  it('automatically stops node-owned observers on destruction', () => {
    const owner = groupNode();
    const count = createValue(1);
    const listener = vi.fn();

    owner.watch(count, listener);
    count.set(2);
    owner.destroy();
    count.set(3);

    expect(listener.mock.calls).toEqual([[1], [2]]);
  });
});
