import { describe, expect, it, vi } from 'vitest';

import { fk } from '../../index';

describe('signals', () => {
  it('subscribes with an idempotent unsubscribe function', () => {
    const event = fk.createSignal<[number]>();

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
    const event = fk.createSignal();
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

  it('notifies later subscribers when an earlier subscriber fails', () => {
    const event = fk.createSignal();
    const laterSubscriber = vi.fn();

    event.subscribe(() => {
      throw new Error('first failed');
    });
    event.subscribe(laterSubscriber);

    expect(() => event.emit()).toThrow(/first failed/);
    expect(laterSubscriber).toHaveBeenCalledOnce();
  });
});
