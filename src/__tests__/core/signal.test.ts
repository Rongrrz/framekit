import { describe, expect, it, vi } from 'vitest';

import { createSignal } from '../..';

describe('signals', () => {
  it('subscribes with an idempotent unsubscribe function', () => {
    const signal = createSignal<[number]>();
    const listener = vi.fn();
    const unsubscribe = signal.subscribe(listener);
    signal.emit(1);
    unsubscribe();
    unsubscribe();
    signal.emit(2);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(1);
  });

  it('uses an emission snapshot and can clear every subscriber', () => {
    const signal = createSignal();
    const lateSubscriber = vi.fn();
    const firstSubscriber = vi.fn(() => signal.subscribe(lateSubscriber));
    signal.subscribe(firstSubscriber);

    signal.emit();
    expect(lateSubscriber).not.toHaveBeenCalled();
    signal.emit();
    expect(lateSubscriber).toHaveBeenCalledOnce();

    signal.clear();
    signal.emit();
    expect(firstSubscriber).toHaveBeenCalledTimes(2);
    expect(lateSubscriber).toHaveBeenCalledOnce();
  });
});
