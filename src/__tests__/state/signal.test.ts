import { createSignalEmitter } from 'framekit';
import { describe, expect, it, vi } from 'vitest';

describe('signals', () => {
  it('owns each subscription independently, including repeated listener functions', () => {
    const event = createSignalEmitter<[number]>();
    const listener = vi.fn();
    const stop = event.subscribe(listener);
    event.subscribe(listener);
    event.emit(1);
    stop();
    stop();
    event.emit(2);

    expect(listener.mock.calls).toEqual([[1], [1], [2]]);
  });

  it.each([
    { failure: undefined },
    { failure: null },
    { failure: false },
    { failure: 0 },
    { failure: new Error('listener failed') },
  ])('preserves a thrown $failure value while notifying later listeners', ({ failure }) => {
    expect.assertions(2);

    const event = createSignalEmitter();
    const later = vi.fn();
    event.subscribe(() => {
      throw failure;
    });
    event.subscribe(later);

    try {
      event.emit();
    } catch (error) {
      expect(error).toBe(failure);
    }

    expect(later).toHaveBeenCalledOnce();
  });

  it('preserves nested emissions when a sole listener replaces itself', () => {
    const event = createSignalEmitter<[number]>();
    const received: string[] = [];

    const stop = event.subscribe((value) => {
      received.push(`first:${value}`);
      stop();
      event.subscribe((nestedValue) => received.push(`replacement:${nestedValue}`));
      event.emit(value + 1);
    });

    event.emit(1);
    event.emit(3);

    expect(received).toEqual(['first:1', 'replacement:2', 'replacement:3']);
  });

  it('subscribes with an idempotent unsubscribe function', () => {
    const event = createSignalEmitter<[number]>();

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

  it.each(['clear', 'unsubscribe'] as const)(
    'keeps a new registration when an old unsubscribe runs after %s',
    (cleanup) => {
      const event = createSignalEmitter<[number]>();
      const listener = vi.fn();
      const unsubscribeOld = event.subscribe(listener);

      if (cleanup === 'clear') {
        event.clear();
      } else {
        unsubscribeOld();
      }

      event.emit(1);

      expect(listener).not.toHaveBeenCalled();

      const unsubscribeNew = event.subscribe(listener);
      unsubscribeOld();
      unsubscribeOld();
      event.emit(2);
      unsubscribeNew();
      event.emit(3);

      expect(listener.mock.calls).toEqual([[2]]);
    },
  );

  it('uses an emission snapshot and can clear every subscriber', () => {
    const event = createSignalEmitter();
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

  it('keeps removed listeners in the current emission but not the next one', () => {
    const event = createSignalEmitter();
    const later = vi.fn();
    event.subscribe(() => unsubscribe());

    const unsubscribe = event.subscribe(later);
    event.emit();
    event.emit();
    expect(later).toHaveBeenCalledOnce();
  });

  it('aggregates listener failures without skipping successful listeners', () => {
    const event = createSignalEmitter();
    const first = new Error('first failed');
    const second = new Error('second failed');
    const later = vi.fn();
    event.subscribe(() => {
      throw first;
    });

    event.subscribe(() => {
      throw second;
    });
    event.subscribe(later);
    expect(() => event.emit()).toThrow(expect.objectContaining({ errors: [first, second] }));
    expect(later).toHaveBeenCalledOnce();
  });
});
