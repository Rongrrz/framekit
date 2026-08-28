import { describe, expect, it, vi } from 'vitest';

import { fk } from '../..';
import { groupNode } from '../helpers/group-node';

const { destroy } = fk;
const { observable, observe, signal } = fk.state;

describe('signals', () => {
  it('subscribes with an idempotent unsubscribe function', () => {
    const event = signal<[number]>();
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
    const event = signal();
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

describe('observable values', () => {
  it('provides the current value and publishes distinct updates', () => {
    const count = observable(1);
    const listener = vi.fn();
    const unsubscribe = count.subscribe(listener);

    expect(Object.isFrozen(count)).toBe(true);

    count.set(2);
    count.set(2);
    count.update((current) => current + 3);
    unsubscribe();
    count.set(8);

    expect(count.get()).toBe(8);
    expect(listener.mock.calls).toEqual([[1], [2], [5]]);
  });

  it('stores function values without confusing them with updater functions', () => {
    const first = () => 1;
    const second = () => 2;
    const value = observable(first);

    value.set(second);

    expect(value.get()).toBe(second);
  });

  it('does not publish when an updater returns the current value', () => {
    const value = observable(2);
    const listener = vi.fn();
    value.subscribe(listener);

    value.update((current) => current);

    expect(listener).toHaveBeenCalledOnce();
  });

  it('automatically stops node-owned observers on destruction', () => {
    const owner = groupNode();
    const count = observable(1);
    const listener = vi.fn();
    observe(owner, count, listener);

    count.set(2);
    destroy(owner);
    count.set(3);

    expect(listener.mock.calls).toEqual([[1], [2]]);
  });
});
